import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qkraaygwvnwzotyqdnlx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gHQhjhxovzymM7ELtSyxrg_Lq3XQduP';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
