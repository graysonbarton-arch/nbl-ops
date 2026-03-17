/**
 * Shared Master Tour API client
 * OAuth 1.0 HMAC-SHA1 signing with key/secret from env vars.
 */

import crypto from 'crypto';
import https from 'https';

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
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map(k => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&');

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join('&');

  const signingKey = percentEncode(consumerSecret) + '&';
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

export function mtFetch(path, queryParams = {}) {
  const key = process.env.MASTERTOUR_KEY;
  const secret = process.env.MASTERTOUR_SECRET;
  if (!key || !secret) {
    return Promise.reject(new Error('Master Tour API credentials not configured'));
  }

  queryParams = { version: '7', ...queryParams };

  const url = `${MT_BASE}/${path}`;

  const oauthParams = {
    oauth_consumer_key: key,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
  };

  const allParams = { ...queryParams, ...oauthParams };
  const signature = buildOAuthSignature('GET', url, allParams, secret);
  oauthParams.oauth_signature = signature;

  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ');

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
