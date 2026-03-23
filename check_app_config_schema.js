import fetch from 'node-fetch';

const url = 'https://zgkjevyvfistqxxkxsnb.supabase.co';
const key = 'sb_publishable_FoY9GcrI1roCMLJiffn7Tw_zMKy3eG7';

async function check() {
  const res = await fetch(`${url}/rest/v1/app_config?select=*`, {
    method: 'OPTIONS',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });
  console.log(res.status);
}

check();
