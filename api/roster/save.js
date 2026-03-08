import { getServiceClient, getUser } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await getUser(req);
  if (!auth) return res.status(401).json({ error: 'Not authenticated' });

  const { roster } = req.body;
  if (!Array.isArray(roster)) return res.status(400).json({ error: 'roster must be an array' });

  const supabase = getServiceClient();

  // Replace entire roster: delete all, then insert new
  await supabase.from('shared_roster').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  if (roster.length > 0) {
    const rows = roster.map(r => ({
      name: r.name || '',
      position: r.position || '',
      pay_type: r.payType || 'day',
      rate: r.rate || '',
      dob: r.dob || '',
      sky_miles: r.skyMiles || '',
      ktn: r.ktn || '',
      hilton: r.hilton || '',
      marriott: r.marriott || '',
      shirt_size: r.shirtSize || '',
      email: r.email || '',
      phone: r.phone || '',
      created_by: auth.user.id,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('shared_roster').insert(rows);
    if (error) return res.status(500).json({ error: error.message });
  }

  res.json({ success: true, count: roster.length });
}
