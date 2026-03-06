import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Server-side client with service role (bypasses RLS)
export function getServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Server-side client scoped to a user's JWT (respects RLS)
export function getUserClient(accessToken) {
  return createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
}

// Extract and validate JWT from request
export async function getUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const supabase = getServiceClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { user, token };
}
