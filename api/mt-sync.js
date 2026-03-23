/**
 * Master Tour Sync Cron — /api/mt-sync
 *
 * Polls MT for all tours & upcoming show dates, compares against
 * stored state in Supabase, and emails alerts for new or changed shows.
 * Runs daily at 10am UTC via Vercel cron.
 */

import { Resend } from 'resend';
import { mtFetch } from '../lib/mastertour.js';
import { getServiceClient } from '../lib/supabase.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const SHOW_TYPES = ['show day', 'load-in day'];
const TABLE = 'mt_sync_state';

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(d) {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  } catch { return d; }
}

async function getStoredShows(supabase) {
  const { data } = await supabase.from(TABLE).select('*');
  return data || [];
}

async function upsertShows(supabase, shows) {
  if (!shows.length) return;
  await supabase.from(TABLE).upsert(shows, { onConflict: 'day_id' });
}

function buildAlertEmail(newShows, changedShows) {
  let sections = '';

  if (newShows.length) {
    sections += `
      <div class="tag">New Shows Added</div>
      <div class="meta">
        ${newShows.map(s => `
          <div class="meta-row">
            <span class="meta-label">${esc(formatDate(s.show_date))}</span>
            <span class="meta-value">${esc(s.venue)} — ${esc(s.city)}${s.state ? ', ' + esc(s.state) : ''}</span>
          </div>
        `).join('')}
      </div>`;
  }

  if (changedShows.length) {
    sections += `
      <div class="tag" style="margin-top:24px">Shows Updated</div>
      <div class="meta">
        ${changedShows.map(s => `
          <div class="meta-row">
            <span class="meta-label">${esc(formatDate(s.show_date))}</span>
            <span class="meta-value">${esc(s.venue)} — ${esc(s.city)}${s.state ? ', ' + esc(s.state) : ''}<br>
              <span style="color:#666;font-size:10px">Changed: ${esc(s.changes.join(', '))}</span>
            </span>
          </div>
        `).join('')}
      </div>`;
  }

  return `
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
    .tag { display: inline-block; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #666; border: 1px solid #333; padding: 4px 10px; margin-bottom: 16px; }
    .meta { background: #1a1a1a; border: 1px solid #333; padding: 20px; margin: 0 0 24px; }
    .meta-row { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #2a2a2a; font-size: 12px; }
    .meta-row:last-child { border-bottom: none; padding-bottom: 0; }
    .meta-label { color: #666; letter-spacing: 0.1em; text-transform: uppercase; font-size: 10px; min-width: 120px; padding-top: 1px; }
    .meta-value { color: #f5f5f0; }
    .cta { display: block; background: #f5f5f0; color: #0a0a0a; text-decoration: none; text-align: center; padding: 16px; font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; margin: 32px 0; font-weight: bold; }
    p { line-height: 1.7; color: #999; font-size: 12px; margin-bottom: 12px; }
    .footer { border-top: 1px solid #333; margin-top: 40px; padding-top: 20px; font-size: 10px; color: #444; letter-spacing: 0.1em; line-height: 1.8; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="logo"><strong>Nappy Boy Live</strong> — Master Tour Sync</div>
    </div>
    <h1>Tour Update</h1>
    <p>${newShows.length} new show${newShows.length !== 1 ? 's' : ''} and ${changedShows.length} update${changedShows.length !== 1 ? 's' : ''} detected in Master Tour.</p>
    ${sections}
    <a href="https://nbl-ops.vercel.app/advances.html" class="cta">View Advances</a>
    <div class="footer">
      Nappy Boy Live &nbsp;·&nbsp; Master Tour Auto-Sync<br>
      Build it right. Execute it clean. Elevate the stage.
    </div>
  </div>
</body>
</html>`;
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

  const supabase = getServiceClient();
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Fetch all tours from MT
    const toursResp = await mtFetch('tours');
    const tours = toursResp.data?.tours || [];

    // 2. Gather all upcoming show dates across all tours
    const currentShows = [];
    for (const t of tours) {
      const tourId = t.tourId || t.id;
      const tourName = t.legName || t.organizationName || t.tourName || t.artistName || 'Unknown';
      try {
        const tourResp = await mtFetch(`tour/${tourId}`, { numPastDays: '0' });
        const tour = tourResp.data?.tour || tourResp.data || {};
        const days = tour.days || [];

        for (const d of days) {
          const type = (d.dayType || '').toLowerCase();
          if (!SHOW_TYPES.includes(type)) continue;

          const rawDate = d.dayDate || d.date || '';
          let showDate;
          try { showDate = new Date(rawDate).toISOString().split('T')[0]; } catch { continue; }
          if (showDate < today) continue;

          currentShows.push({
            day_id: d.id,
            tour_id: tourId,
            tour_name: tourName,
            show_date: showDate,
            venue: d.name || '',
            city: d.city || '',
            state: d.state || '',
            day_type: d.dayType || '',
          });
        }
      } catch (err) {
        console.error(`Failed to fetch tour ${tourId}:`, err.message);
      }
    }

    // 3. Compare against stored state
    const stored = await getStoredShows(supabase);
    const storedMap = new Map(stored.map(s => [s.day_id, s]));

    const newShows = [];
    const changedShows = [];

    for (const show of currentShows) {
      const existing = storedMap.get(show.day_id);
      if (!existing) {
        newShows.push(show);
      } else {
        const changes = [];
        if (existing.show_date !== show.show_date) changes.push('date');
        if (existing.venue !== show.venue) changes.push('venue');
        if (existing.city !== show.city) changes.push('city');
        if (existing.state !== show.state) changes.push('state');
        if (changes.length) {
          changedShows.push({ ...show, changes });
        }
      }
    }

    // 4. Send email if there are changes
    let emailSent = false;
    if ((newShows.length || changedShows.length) && process.env.ALERT_EMAIL) {
      const FROM = `Nappy Boy Live <ops@${process.env.EMAIL_DOMAIN || 'nappyboylive.com'}>`;
      const subject = newShows.length
        ? `[NBL] ${newShows.length} New Show${newShows.length > 1 ? 's' : ''} Added in Master Tour`
        : `[NBL] ${changedShows.length} Show Update${changedShows.length > 1 ? 's' : ''} in Master Tour`;

      const { error } = await resend.emails.send({
        from: FROM,
        to: [process.env.ALERT_EMAIL],
        subject,
        html: buildAlertEmail(newShows, changedShows),
      });

      if (error) {
        console.error('Email send error:', error);
      } else {
        emailSent = true;
      }
    }

    // 5. Update stored state with current snapshot
    await upsertShows(supabase, currentShows);

    return res.status(200).json({
      ran: new Date().toISOString(),
      toursChecked: tours.length,
      upcomingShows: currentShows.length,
      newShows: newShows.length,
      changedShows: changedShows.length,
      emailSent,
    });

  } catch (err) {
    console.error('MT sync error:', err);
    // Alert on cron failure
    if (process.env.ALERT_EMAIL) {
      try {
        const FROM = `Nappy Boy Live <ops@${process.env.EMAIL_DOMAIN || 'nappyboylive.com'}>`;
        await resend.emails.send({
          from: FROM,
          to: [process.env.ALERT_EMAIL],
          subject: '[NBL] ⚠ Master Tour Sync FAILED',
          html: `<pre style="font-family:monospace;color:#e74c3c;background:#0a0a0a;padding:20px;">MT sync cron failed at ${new Date().toISOString()}\n\n${esc(err.message || String(err))}</pre>`,
        });
      } catch (emailErr) {
        console.error('Failed to send cron failure alert:', emailErr);
      }
    }
    return res.status(500).json({ error: 'MT sync failed', detail: err.message });
  }
}
