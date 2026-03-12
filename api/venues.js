import { getServiceClient, getUser } from '../lib/supabase.js';

export default async function handler(req, res) {
  // Auth is optional
  const auth = await getUser(req);
  const userId = auth ? auth.user.id : null;

  const supabase = getServiceClient();

  // GET = list all active venues
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('shared_venues')
      .select('*')
      .eq('is_archived', false)
      .order('city');

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  // POST = replace entire venue list (transaction-safe via RPC)
  if (req.method === 'POST') {
    const { venues } = req.body;
    if (!Array.isArray(venues)) return res.status(400).json({ error: 'venues must be an array' });

    const rows = venues.map(v => ({
      city: v.city || '', venue: v.venue || '',
    }));

    const { error } = await supabase.rpc('replace_venues', {
      new_venues: JSON.stringify(rows),
      p_created_by: userId,
    });

    if (error) {
      // Fallback: if RPC doesn't exist yet, use direct method
      if (error.message && error.message.includes('replace_venues')) {
        await supabase.from('shared_venues').update({ is_archived: true }).eq('is_archived', false);
        if (venues.length > 0) {
          const insertRows = rows.map(r => ({
            ...r, created_by: userId, updated_at: new Date().toISOString(),
          }));
          const { error: insertError } = await supabase.from('shared_venues').insert(insertRows);
          if (insertError) return res.status(500).json({ error: insertError.message });
        }
      } else {
        return res.status(500).json({ error: error.message });
      }
    }

    return res.json({ success: true, count: venues.length });
  }

  // DELETE = soft-delete single venue
  if (req.method === 'DELETE') {
    const { city, venue } = req.body;
    if (!venue) return res.status(400).json({ error: 'venue is required' });

    let query = supabase.from('shared_venues')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('venue', venue);
    if (city) query = query.eq('city', city);

    const { error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
