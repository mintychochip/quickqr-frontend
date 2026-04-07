import { createBrowserClient } from '@supabase/ssr';

// Fallback values for build time - these are public keys meant for client-side
const FALLBACK_SUPABASE_URL = 'https://ghusxqefferhjeaqebbk.supabase.co';
const FALLBACK_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodXN4cWVmZmVyaGplYXFlYmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNTEwODYsImV4cCI6MjA5MDkyNzA4Nn0.cp6kbL14DFOx1cYSg-FaLnmp7hKXiXpibzcz8kDGdO4';

const supabaseUrl = (import.meta.env.PUBLIC_SUPABASE_URL as string) || FALLBACK_SUPABASE_URL;
const supabasePublishableKey = (import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY as string) || FALLBACK_SUPABASE_KEY;

export const supabase = createBrowserClient(supabaseUrl, supabasePublishableKey);
