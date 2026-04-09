// Client for the external Supabase project (data operations: vendas, itens, metas, importações)
import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://oqvqcstobyshrzhffagt.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'sb_publishable_0FtvSaMLM4tHz-vX67PY7Q_D7FRq5Jv';

export const supabaseExternal = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);
