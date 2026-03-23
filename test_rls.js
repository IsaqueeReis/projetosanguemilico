import fetch from 'node-fetch';

const url = 'https://zgkjevyvfistqxxkxsnb.supabase.co';
const key = 'sb_publishable_FoY9GcrI1roCMLJiffn7Tw_zMKy3eG7';

async function check() {
  const res = await fetch(`${url}/rest/v1/app_config?select=*`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ key: 'test_rls', value: { test: true } })
  });
  console.log(res.status, res.statusText);
  const text = await res.text();
  console.log(text);
}

check();
