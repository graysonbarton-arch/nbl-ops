import { getUser } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await getUser(req);
  if (!auth) return res.status(401).json({ error: 'Not authenticated' });

  return res.status(200).json({
    user: {
      id: auth.user.id,
      email: auth.user.email,
      created_at: auth.user.created_at
    }
  });
}
