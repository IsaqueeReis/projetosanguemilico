import { createClient } from '@supabase/supabase-js';

const url = 'https://zgkjevyvfistqxxkxsnb.supabase.co';
const key = 'sb_publishable_FoY9GcrI1roCMLJiffn7Tw_zMKy3eG7';

async function check() {
  const res = await fetch(`${url}/rest/v1/study_plans?select=*&limit=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });
  const data = await res.json();
  console.log('study_plans:', data);
}
check();
