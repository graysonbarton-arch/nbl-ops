/**
 * Master Tour API Proxy
 *
 * Single serverless function handling multiple Master Tour API actions.
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

import { mtFetch } from '../lib/mastertour.js';

export default async function handler(req, res) {
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

      case 'itinerary':
        if (!dayId) return res.status(400).json({ error: 'dayId required' });
        result = await mtFetch(`day/${dayId}/schedule`);
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
}
