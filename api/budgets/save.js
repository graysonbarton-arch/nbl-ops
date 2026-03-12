import { getServiceClient, getUser } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth is optional — use user ID if logged in, 'anonymous' otherwise
  const auth = await getUser(req);
  const userId = auth ? auth.user.id : 'anonymous';

  const { id, title, subtitle, status, data } = req.body;
  if (!data) return res.status(400).json({ error: 'Budget data is required' });

  try {
    const supabase = getServiceClient();

    if (id) {
      // Check if budget exists
      const { data: existing } = await supabase
        .from('budgets')
        .select('id')
        .eq('id', id)
        .single();

      if (existing) {
        // Update existing
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
        // Insert with provided ID (syncing from client)
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
      // Create new with auto ID
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
    return res.status(500).json({ error: 'Failed to save budget' });
  }
}
