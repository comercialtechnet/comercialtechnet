// Client for the external Supabase project (data operations: vendas, itens, metas, importações)
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://tbrdrutglvzrupkkvzhk.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'sb_publishable_agXtrf4zSNNvkZDoJuEr7A_WT_ZFCJD';

let client: SupabaseClient;
try {
  client = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
} catch (e) {
  console.error('Failed to create external Supabase client:', e);
  client = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabaseExternal = client;
