import { getServiceClient, getUser } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await getUser(req);
  if (!auth) return res.status(401).json({ error: 'Not authenticated' });

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('shared_roster')
    .select('*')
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
}
