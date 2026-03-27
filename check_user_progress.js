const { createClient } = require('@supabase/supabase-js');

const url = 'https://zgkjevyvfistqxxkxsnb.supabase.co';
const key = 'sb_publishable_FoY9GcrI1roCMLJiffn7Tw_zMKy3eG7';

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .limit(1);
  console.log(data, error);
}
check();
