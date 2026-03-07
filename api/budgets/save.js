import { getServiceClient } from '../../lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, title, subtitle, status, data } = req.body;
    if (!data) return res.status(400).json({ error: 'Budget data is required' });

  try {
        const supabase = getServiceClient();

      if (id) {
              const updates = {
                        data,
                        updated_at: new Date().toISOString(),
                        updated_by: null
              };
              if (title !== undefined) updates.title = title;
              if (subtitle !== undefined) updates.subtitle = subtitle;
              if (status !== undefined) updates.status = status;

          const { data: budget, error } = await supabase
                .from('budgets')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

          if (error) throw error;
              return res.status(200).json({ budget, created: false });
      } else {
              const { data: budget, error } = await supabase
                .from('budgets')
                .insert({
                            title: title || 'Untitled Budget',
                            subtitle: subtitle || '',
                            status: status || 'draft',
                            data,
                            created_by: null,
                            updated_by: null
                })
                .select()
                .single();

          if (error) throw error;
              return res.status(201).json({ budget, created: true });
      }
  } catch (err) {
        console.error('Save budget error:', err);
        return res.status(500).json({ error: 'Failed to save budget' });
  }
}
