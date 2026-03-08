import { getServiceClient, getUser } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await getUser(req);
  if (!auth) return res.status(401).json({ error: 'Not authenticated' });

  const { venues } = req.body;
  if (!Array.isArray(venues)) return res.status(400).json({ error: 'venues must be an array' });

  const supabase = getServiceClient();

  // Replace entire venue list: delete all, then insert new
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

  res.json({ success: true, count: venues.length });
}
