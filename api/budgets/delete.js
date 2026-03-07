import { getServiceClient } from '../../lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Budget ID is required' });

  try {
        const supabase = getServiceClient();
        const { error } = await supabase
          .from('budgets')
          .update({ is_archived: true, updated_at: new Date().toISOString() })
          .eq('id', id);

      if (error) throw error;
        return res.status(200).json({ success: true });
  } catch (err) {
        console.error('Delete budget error:', err);
        return res.status(500).json({ error: 'Failed to delete budget' });
  }
}
