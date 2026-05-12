import { createClient, SupabaseClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const EXTERNAL_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!EXTERNAL_SUPABASE_URL || !EXTERNAL_SUPABASE_ANON_KEY) {
  throw new Error('Supabase environment variables are missing.');
}

export const supabaseExternal: SupabaseClient = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);