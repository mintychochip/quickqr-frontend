import { createServerClient, parseCookieHeader } from "@supabase/ssr";

export const createClient = (context: { headers: Headers; cookies: any }) => {
  const supabase = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
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