import { getServiceClient, getUser } from '../lib/supabase.js';

export default async function handler(req, res) {
  const action = req.query.action || req.url.split('/api/budgets/')[1]?.split('?')[0];

  // LIST
  if (req.method === 'GET' && (!action || action === 'list')) {
    try {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('budgets')
        .select('id, title, subtitle, status, created_at, updated_at, created_by, updated_by')
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (err) {
      console.error('List budgets error:', err);
      return res.status(500).json({ error: 'Failed to list budgets' });
    }
  }

  // GET
  if (req.method === 'GET' && action === 'get') {
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

  // SAVE
  if (req.method === 'POST' && (!action || action === 'save')) {
    const auth = await getUser(req);
    const userId = auth ? auth.user.id : 'anonymous';

    const { id, title, subtitle, status, data } = req.body;
    if (!data) return res.status(400).json({ error: 'Budget data is required' });

    try {
      const supabase = getServiceClient();

      if (id) {
        const { data: existing } = await supabase
          .from('budgets')
          .select('id')
          .eq('id', id)
          .single();

        if (existing) {
          const updates = {
            data,
            updated_at: new Date().toISOString(),
            updated_by: userId,
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
              id,
              title: title || 'Untitled Budget',
              subtitle: subtitle || '',
              status: status || 'Draft',
              data,
              created_by: userId,
              updated_by: userId,
            })
            .select()
            .single();

          if (error) throw error;
          return res.status(201).json({ budget, created: true });
        }
      } else {
        const newId = 'proj_' + Date.now();
        const { data: budget, error } = await supabase
          .from('budgets')
          .insert({
            id: newId,
            title: title || 'Untitled Budget',
            subtitle: subtitle || '',
            status: status || 'Draft',
            data,
            created_by: userId,
            updated_by: userId,
          })
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ budget, created: true });
      }
    } catch (err) {
      console.error('Save budget error:', err);
      return res.status(500).json({ error: 'Failed to save budget', detail: err?.message || String(err) });
    }
  }

  // DELETE
  if (req.method === 'POST' && action === 'delete') {
    const auth = await getUser(req);
    const userId = auth ? auth.user.id : 'anonymous';

    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Budget ID is required' });

    try {
      const supabase = getServiceClient();
      const { error } = await supabase
        .from('budgets')
        .update({
          is_archived: true,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Delete budget error:', err);
      return res.status(500).json({ error: 'Failed to delete budget' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
