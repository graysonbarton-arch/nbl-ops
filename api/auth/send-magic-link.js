import { getServiceClient } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
