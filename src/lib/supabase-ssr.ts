import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { APIContext } from "astro";

const FALLBACK_SUPABASE_URL = 'https://ghusxqefferhjeaqebbk.supabase.co';
const FALLBACK_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodXN4cWVmZmVyaGplYXFlYmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNTEwODYsImV4cCI6MjA5MDkyNzA4Nn0.cp6kbL14DFOx1cYSg-FaLnmp7hKXiXpibzcz8kDGdO4';

export const createClient = (context: APIContext) => {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_KEY;

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(context.request.headers.get('cookie') ?? '').map(c => ({
            name: c.name,
            value: c.value ?? '',
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            context.cookies.set(name, value, {
              ...options,
              path: options?.path ?? '/',
            });
          });
        },
      },
    }
  );
};
