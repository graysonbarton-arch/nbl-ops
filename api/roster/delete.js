import { getServiceClient, getUser } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await getUser(req);
  if (!auth) return res.status(401).json({ error: 'Not authenticated' });

  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const supabase = getServiceClient();
  const { error } = await supabase.from('shared_roster').delete().eq('name', name);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}
