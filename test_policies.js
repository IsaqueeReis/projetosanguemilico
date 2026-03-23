import { createClient } from '@supabase/supabase-js';

const url = 'https://zgkjevyvfistqxxkxsnb.supabase.co';
const key = 'sb_publishable_FoY9GcrI1roCMLJiffn7Tw_zMKy3eG7';
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.rpc('get_policies');
  console.log({ data, error });
}

test();
