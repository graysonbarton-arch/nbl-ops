import { getServiceClient, getUser } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await getUser(req);

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('advances')
      .select('id, show_name, venue, show_date, status, linked_project_id, created_at, updated_at')
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (err) {
    console.error('List advances error:', err);
    return res.status(500).json({ error: 'Failed to list advances' });
  }
}
