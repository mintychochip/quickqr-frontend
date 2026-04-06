import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string;
const supabasePublishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;

export const supabase = createClient(supabaseUrl || '', supabasePublishableKey || '');
