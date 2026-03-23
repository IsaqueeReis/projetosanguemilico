import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const url = 'https://zgkjevyvfistqxxkxsnb.supabase.co';
const key = 'sb_publishable_FoY9GcrI1roCMLJiffn7Tw_zMKy3eG7';
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('app_config').upsert({ key: 'study_plans_list', value: [{id: '1', title: 'Test'}] });
  console.log('Upsert:', { data, error });
  
  const { data: d2, error: e2 } = await supabase.from('app_config').select('*').eq('key', 'study_plans_list');
  console.log('Select:', { d2, e2 });
}

test();
