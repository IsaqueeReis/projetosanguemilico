const url = 'https://zgkjevyvfistqxxkxsnb.supabase.co';
const key = 'sb_publishable_FoY9GcrI1roCMLJiffn7Tw_zMKy3eG7';

async function check(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });
  const data = await res.json();
  console.log(`${table}:`, data.message ? data.message : 'EXISTS');
}

async function run() {
  const tables = [
    'training_plans', 'training_sessions', 'nutrition_plans', 'meals', 'metrics'
  ];
  for (const table of tables) {
    await check(table);
  }
}
run();
