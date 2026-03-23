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
    'users', 'materials', 'simulados', 'editais', 'study_plans',
    'app_config', 'user_progress', 'mentorship_plans',
    'essay_topics', 'essay_submissions', 'essay_reviews',
    'qb_questions', 'qb_alternatives', 'qb_resolutions', 'qb_student_answers',
    'fc_decks', 'fc_cards', 'fc_progress', 'study_logs'
  ];
  for (const table of tables) {
    await check(table);
  }
}
run();
