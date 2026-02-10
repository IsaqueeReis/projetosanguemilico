import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zgkjevyvfistqxxkxsnb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FoY9GcrI1roCMLJiffn7Tw_zMKy3eG7'; // Use environment variables in production

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
