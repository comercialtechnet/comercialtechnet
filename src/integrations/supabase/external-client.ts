// Client for the external Supabase project (data operations: vendas, itens, metas, importações)
import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://tbrdrutglvzrupkkvzhk.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'sb_publishable_agXtrf4zSNNvkZDoJuEr7A_WT_ZFCJD';

export const supabaseExternal = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);
