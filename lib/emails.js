// ─── Shared email styles ────────────────────────────────────────────────────
const base = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0a; color: #f5f5f0; font-family: 'Courier New', monospace; font-size: 13px; }
    .wrap { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
    .header { border-bottom: 1px solid #333; padding-bottom: 24px; margin-bottom: 32px; }
    .logo { font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: #666; }
    .logo strong { color: #f5f5f0; }
    h1 { font-size: 28px; letter-spacing: 0.05em; text-transform: uppercase; margin: 20px 0 8px; line-height: 1.1; }
    .tag { display: inline-block; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #666; border: 1px solid #333; padding: 4px 10px; margin-bottom: 24px; }
    .meta { background: #1a1a1a; border: 1px solid #333; padding: 20px; margin: 24px 0; }
    .meta-row { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #2a2a2a; font-size: 12px; }
    .meta-row:last-child { border-bottom: none; padding-bottom: 0; }
    .meta-label { color: #666; letter-spacing: 0.1em; text-transform: uppercase; font-size: 10px; min-width: 120px; padding-top: 1px; }
    .meta-value { color: #f5f5f0; }
    .cta { display: block; background: #f5f5f0; color: #0a0a0a; text-decoration: none; text-align: center; padding: 16px; font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; margin: 32px 0; font-weight: bold; }
    .warning { border-left: 3px solid #c0392b; padding: 12px 16px; background: rgba(192,57,43,0.08); margin: 24px 0; font-size: 12px; color: #e74c3c; letter-spacing: 0.05em; line-height: 1.7; }
    .footer { border-top: 1px solid #333; margin-top: 40px; padding-top: 20px; font-size: 10px; color: #444; letter-spacing: 0.1em; line-height: 1.8; }
    p { line-height: 1.7; color: #999; font-size: 12px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="logo"><strong>Nappy Boy Live</strong> — Internal Operations</div>
    </div>
    ${content}
    <div class="footer">
      Nappy Boy Live &nbsp;·&nbsp; Internal Operations System<br>
      Build it right. Execute it clean. Elevate the stage.
    </div>
  </div>
</body>
</html>
`;

// ─── Confirmation: sent immediately on intake submit ─────────────────────────
export function confirmationEmail({ eventName, eventDate, deadline, venue, submitterName }) {
  return base(`
    <div class="tag">Project Intake Confirmed</div>
    <h1>Intake Received</h1>
    <p>Your project has been logged and is pending leadership review. A post-event review will be required within 7 days of the event.</p>

    <div class="meta">
      <div class="meta-row">
        <span class="meta-label">Project</span>
        <span class="meta-value">${eventName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Event Date</span>
        <span class="meta-value">${eventDate}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Venue</span>
        <span class="meta-value">${venue || '—'}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Submitted By</span>
        <span class="meta-value">${submitterName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Review Due By</span>
        <span class="meta-value" style="color:#e67e22;">${deadline}</span>
      </div>
    </div>

    <p>Mark your calendar. The post-event review is mandatory and must be submitted within 7 days of the event. Failure to submit will be flagged to leadership.</p>

    <a href="${process.env.SITE_URL || 'https://nbl-ops.vercel.app'}/?tab=postevent" class="cta">Open Post-Event Review Form</a>
  `);
}

// ─── Day 3 reminder ──────────────────────────────────────────────────────────
export function reminder3Email({ eventName, eventDate, deadline, daysLeft, submitterName }) {
  return base(`
    <div class="tag">Post-Event Review — Reminder</div>
    <h1>${daysLeft} Days Left</h1>
    <p>This is your mid-week reminder. The post-event review for <strong style="color:#f5f5f0;">${eventName}</strong> has not been submitted yet.</p>

    <div class="meta">
      <div class="meta-row">
        <span class="meta-label">Project</span>
        <span class="meta-value">${eventName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Event Date</span>
        <span class="meta-value">${eventDate}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Due By</span>
        <span class="meta-value" style="color:#e67e22;">${deadline}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Days Remaining</span>
        <span class="meta-value" style="color:#e67e22;">${daysLeft}</span>
      </div>
    </div>

    <a href="${process.env.SITE_URL || 'https://nbl-ops.vercel.app'}/?tab=postevent" class="cta">Submit Post-Event Review</a>

    <p>Lessons not documented will be repeated. This review is mandatory.</p>
  `);
}

// ─── Day 6 / final warning ───────────────────────────────────────────────────
export function reminderFinalEmail({ eventName, eventDate, deadline, daysLeft, submitterName }) {
  return base(`
    <div class="tag" style="border-color:#c0392b; color:#c0392b;">Final Warning</div>
    <h1>${daysLeft === 0 ? 'Due Today' : `${daysLeft} Day${daysLeft !== 1 ? 's' : ''} Left`}</h1>

    <div class="warning">
      ⚠ This is your final reminder. Failure to submit the post-event review for <strong>${eventName}</strong> by ${deadline} will be escalated to leadership.
    </div>

    <div class="meta">
      <div class="meta-row">
        <span class="meta-label">Project</span>
        <span class="meta-value">${eventName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Event Date</span>
        <span class="meta-value">${eventDate}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Deadline</span>
        <span class="meta-value" style="color:#c0392b;">${deadline}</span>
      </div>
    </div>

    <a href="${process.env.SITE_URL || 'https://nbl-ops.vercel.app'}/?tab=postevent" class="cta" style="background:#c0392b; color:#fff;">Submit Now — ${deadline}</a>
  `);
}

// ─── Overdue alert (sent to leadership) ─────────────────────────────────────
export function overdueAlertEmail({ eventName, eventDate, deadline, submitterName, submitterEmail }) {
  return base(`
    <div class="tag" style="border-color:#c0392b; color:#c0392b;">Escalation — Review Overdue</div>
    <h1>Review Not Submitted</h1>

    <div class="warning">
      The post-event review for <strong>${eventName}</strong> was due ${deadline} and has not been submitted. This is an automated escalation.
    </div>

    <div class="meta">
      <div class="meta-row">
        <span class="meta-label">Project</span>
        <span class="meta-value">${eventName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Event Date</span>
        <span class="meta-value">${eventDate}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Deadline</span>
        <span class="meta-value" style="color:#c0392b;">${deadline}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Responsible</span>
        <span class="meta-value">${submitterName} (${submitterEmail || 'no email on file'})</span>
      </div>
    </div>

    <p>Follow up directly with ${submitterName} to ensure this review is completed immediately.</p>
  `);
}
