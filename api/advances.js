import { getServiceClient, getUser } from '../lib/supabase.js';

export default async function handler(req, res) {
  const { action } = req.query;

  // LIST
  if (req.method === 'GET' && (!action || action === 'list')) {
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

  // GET
  if (req.method === 'GET' && action === 'get') {
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

  // SAVE
  if (req.method === 'POST' && (!action || action === 'save')) {
    // Auth is optional — use user ID if logged in, 'anonymous' otherwise
    const auth = await getUser(req);
    const userId = auth ? auth.user.id : 'anonymous';

    const { id, show_name, venue, show_date, status, linked_project_id, data } = req.body;
    if (!data) return res.status(400).json({ error: 'Advance data is required' });

    try {
      const supabase = getServiceClient();

      if (id) {
        const { data: existing } = await supabase
          .from('advances')
          .select('id')
          .eq('id', id)
          .single();

        if (existing) {
          const updates = {
            data,
            updated_at: new Date().toISOString(),
            updated_by: userId,
          };
          if (show_name !== undefined) updates.show_name = show_name;
          if (venue !== undefined) updates.venue = venue;
          if (show_date !== undefined) updates.show_date = show_date;
          if (status !== undefined) updates.status = status;
          if (linked_project_id !== undefined) updates.linked_project_id = linked_project_id;

          const { data: advance, error } = await supabase
            .from('advances')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          return res.status(200).json({ advance, created: false });
        } else {
          const { data: advance, error } = await supabase
            .from('advances')
            .insert({
              id,
              show_name: show_name || 'Untitled Show',
              venue: venue || '',
              show_date: show_date || null,
              status: status || 'Not Started',
              linked_project_id: linked_project_id || null,
              data,
              created_by: userId,
              updated_by: userId,
            })
            .select()
            .single();

          if (error) throw error;
          return res.status(201).json({ advance, created: true });
        }
      } else {
        const newId = 'adv_' + Date.now();
        const { data: advance, error } = await supabase
          .from('advances')
          .insert({
            id: newId,
            show_name: show_name || 'Untitled Show',
            venue: venue || '',
            show_date: show_date || null,
            status: status || 'Not Started',
            linked_project_id: linked_project_id || null,
            data,
            created_by: userId,
            updated_by: userId,
          })
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ advance, created: true });
      }
    } catch (err) {
      console.error('Save advance error:', err);
      return res.status(500).json({ error: 'Failed to save advance' });
    }
  }

  // DELETE
  if (req.method === 'POST' && action === 'delete') {
    const auth = await getUser(req);
    const userId = auth ? auth.user.id : 'anonymous';

    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Advance ID is required' });

    try {
      const supabase = getServiceClient();
      const { error } = await supabase
        .from('advances')
        .update({
          is_archived: true,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Delete advance error:', err);
      return res.status(500).json({ error: 'Failed to delete advance' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
