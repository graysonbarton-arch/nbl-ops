import { getServiceClient, getUser } from '../lib/supabase.js';

export default async function handler(req, res) {
  const auth = await getUser(req);
  if (!auth) return res.status(401).json({ error: 'Not authenticated' });

  const supabase = getServiceClient();

  // GET = list all active roster entries
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('shared_roster')
      .select('*')
      .eq('is_archived', false)
      .order('name');

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  // POST = replace entire roster (transaction-safe via RPC)
  if (req.method === 'POST') {
    const { roster } = req.body;
    if (!Array.isArray(roster)) return res.status(400).json({ error: 'roster must be an array' });

    const rows = roster.map(r => ({
      name: r.name || '', position: r.position || '',
      pay_type: r.payType || 'day', rate: r.rate || '',
      dob: r.dob || '', sky_miles: r.skyMiles || '',
      ktn: r.ktn || '', hilton: r.hilton || '',
      marriott: r.marriott || '', shirt_size: r.shirtSize || '',
      email: r.email || '', phone: r.phone || '',
    }));

    const { error } = await supabase.rpc('replace_roster', {
      new_roster: JSON.stringify(rows),
      p_created_by: auth.user.id,
    });

    if (error) {
      // Fallback: if RPC doesn't exist yet, use direct method
      if (error.message && error.message.includes('replace_roster')) {
        await supabase.from('shared_roster').update({ is_archived: true }).eq('is_archived', false);
        if (roster.length > 0) {
          const insertRows = rows.map(r => ({
            ...r, created_by: auth.user.id, updated_at: new Date().toISOString(),
          }));
          const { error: insertError } = await supabase.from('shared_roster').insert(insertRows);
          if (insertError) return res.status(500).json({ error: insertError.message });
        }
      } else {
        return res.status(500).json({ error: error.message });
      }
    }

    return res.json({ success: true, count: roster.length });
  }

  // DELETE = soft-delete single roster entry by name
  if (req.method === 'DELETE') {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const { error } = await supabase
      .from('shared_roster')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('name', name);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
