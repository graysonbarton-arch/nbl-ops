import { getServiceClient } from '../../lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
        const supabase = getServiceClient();
        const { data, error } = await supabase
          .from('budgets')
          .select('id, title, subtitle, status, created_at, updated_at, created_by, updated_by')
          .eq('is_archived', false)
          .order('updated_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({ budgets: data || [] });
  } catch (err) {
        console.error('List budgets error:', err);
        return res.status(500).json({ error: 'Failed to list budgets' });
  }
}
