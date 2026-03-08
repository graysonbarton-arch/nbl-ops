import { getServiceClient, getUser } from '../lib/supabase.js';

export default async function handler(req, res) {
  const auth = await getUser(req);
  if (!auth) return res.status(401).json({ error: 'Not authenticated' });

  const supabase = getServiceClient();

  // GET = list all venues
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('shared_venues')
      .select('*')
      .order('city');

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  // POST = replace entire venue list
  if (req.method === 'POST') {
    const { venues } = req.body;
    if (!Array.isArray(venues)) return res.status(400).json({ error: 'venues must be an array' });

    // Delete all existing, then insert new
    await supabase.from('shared_venues').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (venues.length > 0) {
      const rows = venues.map(v => ({
        city: v.city || '',
        venue: v.venue || '',
        created_by: auth.user.id,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('shared_venues').insert(rows);
      if (error) return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, count: venues.length });
  }

  // DELETE = remove single venue
  if (req.method === 'DELETE') {
    const { city, venue } = req.body;
    if (!venue) return res.status(400).json({ error: 'venue is required' });

    let query = supabase.from('shared_venues').delete().eq('venue', venue);
    if (city) query = query.eq('city', city);

    const { error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
