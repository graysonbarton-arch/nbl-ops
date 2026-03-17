import { getServiceClient, getUser } from '../lib/supabase.js';

export default async function handler(req, res) {
  const action = req.query.action || '';

  // SEND MAGIC LINK
  if (req.method === 'POST' && action === 'send-magic-link') {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
      const supabase = getServiceClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.SITE_URL || 'https://nbl-ops.vercel.app'}/budget.html`
        }
      });

      if (error) {
        console.error('Magic link error:', error);
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ success: true, message: 'Magic link sent — check your email' });
    } catch (err) {
      console.error('Auth error:', err);
      return res.status(500).json({ error: 'Failed to send magic link' });
    }
  }

  // SESSION
  if (req.method === 'GET' && action === 'session') {
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

  return res.status(400).json({ error: 'Invalid action. Use: send-magic-link, session' });
}
