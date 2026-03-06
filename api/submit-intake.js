import { Resend } from 'resend';
import { saveProject } from '../lib/store.js';
import { confirmationEmail } from '../lib/emails.js';

const resend = new Resend(process.env.RESEND_API_KEY);

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    submitterName,
    submitterEmail,
    submitterRole,
    eventName,
    eventDate,
    clientName,
    venueName,
    venueCity,
  } = req.body;

  // ─── Validate required fields ──────────────────────────────────────────────
  if (!submitterEmail || !eventName || !eventDate) {
    return res.status(400).json({ error: 'Missing required fields: submitterEmail, eventName, eventDate' });
  }

  const deadline = addDays(eventDate, 7);
  const venue = [venueName, venueCity].filter(Boolean).join(', ');

  // ─── Save project to KV ────────────────────────────────────────────────────
  const project = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    submitterName,
    submitterEmail,
    submitterRole,
    eventName,
    eventDate,
    deadline,
    clientName,
    venue,
    reviewComplete: false,
    reminders: {},
    createdAt: new Date().toISOString(),
  };

  await saveProject(project);

  // ─── Send confirmation email ───────────────────────────────────────────────
  const html = confirmationEmail({
    eventName,
    eventDate: formatDate(eventDate),
    deadline: formatDate(deadline),
    venue,
    submitterName,
  });

  const { error } = await resend.emails.send({
    from: `Nappy Boy Live <ops@${process.env.EMAIL_DOMAIN || 'nappyboylive.com'}>`,
    to: [submitterEmail],
    subject: `[NBL] Intake Confirmed — ${eventName} · Review due ${formatDate(deadline)}`,
    html,
  });

  if (error) {
    console.error('Resend error:', error);
    // Still return success — project is saved even if email fails
    return res.status(200).json({ success: true, projectId: project.id, emailSent: false });
  }

  return res.status(200).json({ success: true, projectId: project.id, emailSent: true });
}
