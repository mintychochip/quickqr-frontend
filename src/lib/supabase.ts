import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabasePublishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// Client-side singleton
let browserClient: ReturnType<typeof createClient> | null = null;

export const supabase = (supabaseUrl && supabasePublishableKey) 
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;

// Parse cookies into a record for Supabase auth
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) cookies[name] = rest.join('=');
  });
  return cookies;
}

// Server-side client with proper cookie handling
export function createServerClient(cookies: AstroCookies) {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Supabase environment variables not configured');
  }
  
  const cookieHeader = cookies.toString();
  
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key: string) => {
          const parsed = parseCookies(cookieHeader);
          return parsed[key] || null;
        },
        setItem: () => {},
        removeItem: () => {},
      },
    },
  });
}

// Get session from cookies for server-side rendering
export async function getSession(cookies: AstroCookies) {
  try {
    if (!supabaseUrl || !supabasePublishableKey) return null;
    const client = createServerClient(cookies);
    const { data: { session } } = await client.auth.getSession();
    return session;
  } catch (e) {
    console.error('getSession error:', e);
    return null;
  }
}

// Get user from cookies
export async function getUser(cookies: AstroCookies) {
  try {
    if (!supabaseUrl || !supabasePublishableKey) return null;
    const client = createServerClient(cookies);
    const { data: { user } } = await client.auth.getUser();
    return user;
  } catch (e) {
    console.error('getUser error:', e);
    return null;
  }
}
