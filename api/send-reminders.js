import { Resend } from 'resend';
import { getAllProjects, markReminderSent } from '../lib/store.js';
import {
  reminder3Email,
  reminderFinalEmail,
  overdueAlertEmail,
} from '../lib/emails.js';

const resend = new Resend(process.env.RESEND_API_KEY);

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function daysUntilDeadline(deadlineStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineStr + 'T00:00:00');
  return Math.round((deadline - today) / 86400000);
}

export default async function handler(req, res) {
  // Security: only allow Vercel cron or requests with the cron secret
  const authHeader = req.headers.authorization;
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const projects = await getAllProjects();
  const pending = projects.filter(p => !p.reviewComplete);
  const results = [];

  for (const project of pending) {
    const daysLeft = daysUntilDeadline(project.deadline);
    const {
      id, submitterName, submitterEmail, eventName,
      eventDate, deadline, venue, reminders = {}
    } = project;

    const emailVars = {
      eventName,
      eventDate: formatDate(eventDate),
      deadline: formatDate(deadline),
      daysLeft,
      submitterName,
      submitterEmail,
      venue,
    };

    const FROM = `Nappy Boy Live <ops@${process.env.EMAIL_DOMAIN || 'nappyboylive.com'}>`;

    // ── Day 3 reminder (4 days before deadline) ──────────────────────────────
    if (daysLeft === 4 && !reminders.day3) {
      const { error } = await resend.emails.send({
        from: FROM,
        to: [submitterEmail],
        subject: `[NBL] Post-Event Review Due in ${daysLeft} Days — ${eventName}`,
        html: reminder3Email(emailVars),
      });
      if (!error) {
        await markReminderSent(id, 'day3');
        results.push({ id, type: 'day3', sent: true });
      } else {
        results.push({ id, type: 'day3', sent: false, error });
      }
    }

    // ── Day 6 / final warning (1 day before deadline) ─────────────────────────
    if (daysLeft === 1 && !reminders.final) {
      const { error } = await resend.emails.send({
        from: FROM,
        to: [submitterEmail],
        subject: `[NBL] ⚠ Final Warning — Post-Event Review Due Tomorrow — ${eventName}`,
        html: reminderFinalEmail(emailVars),
      });
      if (!error) {
        await markReminderSent(id, 'final');
        results.push({ id, type: 'final', sent: true });
      } else {
        results.push({ id, type: 'final', sent: false, error });
      }
    }

    // ── Day 7 / due today ─────────────────────────────────────────────────────
    if (daysLeft === 0 && !reminders.dueToday) {
      const { error } = await resend.emails.send({
        from: FROM,
        to: [submitterEmail],
        subject: `[NBL] Post-Event Review DUE TODAY — ${eventName}`,
        html: reminderFinalEmail({ ...emailVars, daysLeft: 0 }),
      });
      if (!error) {
        await markReminderSent(id, 'dueToday');
        results.push({ id, type: 'dueToday', sent: true });
      }
    }

    // ── Overdue escalation → leadership ──────────────────────────────────────
    if (daysLeft < 0 && !reminders.overdue && process.env.LEADERSHIP_EMAIL) {
      const { error } = await resend.emails.send({
        from: FROM,
        to: [process.env.LEADERSHIP_EMAIL],
        subject: `[NBL] ESCALATION — Review Overdue — ${eventName}`,
        html: overdueAlertEmail(emailVars),
      });
      if (!error) {
        await markReminderSent(id, 'overdue');
        results.push({ id, type: 'overdue', sent: true });
      }
    }
  }

  // Alert if any emails failed to send
  const failures = results.filter(r => !r.sent);
  if (failures.length && process.env.ALERT_EMAIL) {
    try {
      const FROM = `Nappy Boy Live <ops@${process.env.EMAIL_DOMAIN || 'nappyboylive.com'}>`;
      await resend.emails.send({
        from: FROM,
        to: [process.env.ALERT_EMAIL],
        subject: `[NBL] ⚠ ${failures.length} Reminder Email(s) Failed`,
        text: `Reminder cron ran at ${new Date().toISOString()}\n\n${failures.length} email(s) failed to send:\n${failures.map(f => `  - ${f.id} (${f.type}): ${JSON.stringify(f.error)}`).join('\n')}`,
      });
    } catch (alertErr) {
      console.error('Failed to send reminder failure alert:', alertErr);
    }
  }

  return res.status(200).json({
    ran: new Date().toISOString(),
    projectsChecked: pending.length,
    emailsSent: results.filter(r => r.sent).length,
    failures: failures.length,
    results,
  });
}
