import { getServiceClient, getUser } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await getUser(req);

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Advance ID is required' });

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Advance not found' });

    return res.status(200).json(data);
  } catch (err) {
    console.error('Get advance error:', err);
    return res.status(500).json({ error: 'Failed to get advance' });
  }
}
