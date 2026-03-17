/**
 * Master Tour API Proxy
 *
 * Single serverless function handling multiple Master Tour API actions.
 * Uses OAuth 1.0 signing with key/secret from environment variables.
 *
 * Actions (via ?action= query param):
 *   tours     — List all tours
 *   tour      — Get tour details + dates (?tourId=)
 *   day       — Get day details (?dayId=)
 *   crew      — Get crew for a tour (?tourId=)
 *   hotels    — Get hotels for a day (?dayId=)
 *   schedule  — Get events/itinerary for a day (?dayId=)
 *   contacts  — Get contacts for a company (?companyId=)
 *   roomlist  — Get room list for a hotel (?hotelId=)
 */

const crypto = require('crypto');
const https = require('https');

const MT_BASE = 'https://my.eventric.com/portal/api/v5';

function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function buildOAuthSignature(method, url, params, consumerSecret) {
  // Sort params alphabetically
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map(k => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&');

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join('&');

  // OAuth 1.0 HMAC-SHA1 — signing key is consumerSecret& (no token secret)
  const signingKey = percentEncode(consumerSecret) + '&';
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

function mtFetch(path, queryParams = {}) {
  const key = process.env.MASTERTOUR_KEY;
  const secret = process.env.MASTERTOUR_SECRET;
  if (!key || !secret) {
    return Promise.reject(new Error('Master Tour API credentials not configured'));
  }

  const url = `${MT_BASE}/${path}`;

  // OAuth params
  const oauthParams = {
    oauth_consumer_key: key,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
  };

  // Merge query params + oauth params for signature
  const allParams = { ...queryParams, ...oauthParams };
  const signature = buildOAuthSignature('GET', url, allParams, secret);
  oauthParams.oauth_signature = signature;

  // Build Authorization header
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ');

  // Build query string from non-oauth params
  const qs = Object.keys(queryParams).length
    ? '?' + Object.entries(queryParams).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
    : '';

  return new Promise((resolve, reject) => {
    const req = https.get(url + qs, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    }, (resp) => {
      let body = '';
      resp.on('data', chunk => body += chunk);
      resp.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }
        if (resp.statusCode >= 400) {
          const err = new Error(`MT API returned ${resp.statusCode}`);
          err.upstreamStatus = resp.statusCode;
          err.upstreamBody = parsed;
          return reject(err);
        }
        resolve({ status: resp.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout — Master Tour API did not respond within 15s')); });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, tourId, dayId, companyId, hotelId, eventId } = req.query;

  try {
    let result;

    switch (action) {
      case 'tours':
        result = await mtFetch('tours');
        break;

      case 'tour':
        if (!tourId) return res.status(400).json({ error: 'tourId required' });
        // numPastDays=0 gets all dates including past
        result = await mtFetch(`tour/${tourId}`, { numPastDays: '0' });
        break;

      case 'crew':
        if (!tourId) return res.status(400).json({ error: 'tourId required' });
        result = await mtFetch(`tour/${tourId}/crew`);
        break;

      case 'day':
        if (!dayId) return res.status(400).json({ error: 'dayId required' });
        result = await mtFetch(`day/${dayId}`);
        break;

      case 'hotels':
        if (!dayId) return res.status(400).json({ error: 'dayId required' });
        result = await mtFetch(`day/${dayId}/hotels`);
        break;

      case 'schedule':
        if (!dayId) return res.status(400).json({ error: 'dayId required' });
        result = await mtFetch(`day/${dayId}/events`);
        break;

      case 'contacts':
        if (!companyId) return res.status(400).json({ error: 'companyId required' });
        result = await mtFetch(`company/${companyId}/contacts`);
        break;

      case 'roomlist':
        if (!hotelId) return res.status(400).json({ error: 'hotelId required' });
        result = await mtFetch(`hotel/${hotelId}/roomlist`);
        break;

      case 'guestlist':
        if (!eventId) return res.status(400).json({ error: 'eventId required' });
        result = await mtFetch(`event/${eventId}/guestlist`);
        break;

      default:
        return res.status(400).json({ error: 'Invalid action. Use: tours, tour, crew, day, hotels, schedule, contacts, roomlist, guestlist' });
    }

    return res.status(200).json(result.data);

  } catch (err) {
    console.error('Master Tour API error:', err.message, err.upstreamBody || '');
    const status = err.upstreamStatus || 500;
    return res.status(status).json({
      error: 'Master Tour API request failed',
      detail: err.message,
      upstream: err.upstreamBody || null,
    });
  }
};
