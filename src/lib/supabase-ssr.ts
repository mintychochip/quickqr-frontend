import { createServerClient, parseCookieHeader } from "@supabase/ssr";

// Fallback values for build time - these are public keys meant for client-side
const FALLBACK_SUPABASE_URL = 'https://ghusxqefferhjeaqebbk.supabase.co';
const FALLBACK_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodXN4cWVmZmVyaGplYXFlYmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNTEwODYsImV4cCI6MjA5MDkyNzA4Nn0.cp6kbL14DFOx1cYSg-FaLnmp7hKXiXpibzcz8kDGdO4';

export const createClient = (context: { headers: Headers; cookies: any }) => {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_KEY;
  
  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get: (key) => {
          const cookies = parseCookieHeader(context.headers.get('cookie') ?? '')
          const cookie = cookies.find((c) => c.name === key)
          return cookie?.value
        },
        set: (key, value, options) => {
          // Server-side cookie setting not needed for this implementation
        },
        remove: (key, options) => {
          // Server-side cookie removal not needed for this implementation
        },
      },
    }
  );

  return supabase;
};