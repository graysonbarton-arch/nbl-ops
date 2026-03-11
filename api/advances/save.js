import { getServiceClient, getUser } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await getUser(req);
  if (!auth) return res.status(401).json({ error: 'Not authenticated' });

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
          updated_by: auth.user.id,
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
            created_by: auth.user.id,
            updated_by: auth.user.id,
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
          created_by: auth.user.id,
          updated_by: auth.user.id,
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
