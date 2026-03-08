import { getServiceClient, getUser } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await getUser(req);
  if (!auth) return res.status(401).json({ error: 'Not authenticated' });

  const { city, venue } = req.body;
  if (!venue) return res.status(400).json({ error: 'venue is required' });

  const supabase = getServiceClient();
  let query = supabase.from('shared_venues').delete().eq('venue', venue);
  if (city) query = query.eq('city', city);

  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}
