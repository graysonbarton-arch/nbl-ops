import { getUser, getUserClient } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await getUser(req);
  if (!auth) return res.status(401).json({ error: 'Not authenticated' });

  const { id, title, subtitle, status, data } = req.body;
  if (!data) return res.status(400).json({ error: 'Budget data is required' });

  try {
    const supabase = getUserClient(auth.token);

    if (id) {
      // UPDATE existing budget
      const updates = {
        data,
        updated_at: new Date().toISOString(),
        updated_by: auth.user.id
      };
      // Only update metadata fields if provided
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
      // CREATE new budget
      const { data: budget, error } = await supabase
        .from('budgets')
        .insert({
          title: title || 'Untitled Budget',
          subtitle: subtitle || '',
          status: status || 'draft',
          data,
          created_by: auth.user.id,
          updated_by: auth.user.id
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
