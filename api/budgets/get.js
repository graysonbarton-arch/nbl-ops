import { getServiceClient, getUser } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await getUser(req);
  if (!auth) return res.status(401).json({ error: 'Not authenticated' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Budget ID is required' });

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Budget not found' });

    return res.status(200).json(data);
  } catch (err) {
    console.error('Get budget error:', err);
    return res.status(500).json({ error: 'Failed to get budget' });
  }
}
