import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string;
const supabasePublishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;

// Client-side singleton
let browserClient: ReturnType<typeof createClient> | null = null;

export const supabase = createClient(supabaseUrl || '', supabasePublishableKey || '');

// Server-side client with cookie handling
export function createServerClient(cookies: AstroCookies) {
  return createClient(supabaseUrl || '', supabasePublishableKey || '', {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        cookie: cookies.toString(),
      },
    },
  });
}

// Get session from cookies for server-side rendering
export async function getSession(cookies: AstroCookies) {
  const client = createServerClient(cookies);
  const { data: { session } } = await client.auth.getSession();
  return session;
}

// Get user from cookies
export async function getUser(cookies: AstroCookies) {
  const client = createServerClient(cookies);
  const { data: { user } } = await client.auth.getUser();
  return user;
}
