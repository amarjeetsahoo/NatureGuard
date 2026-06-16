import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const SUPABASE_URL = 'https://jeqqzkpjqekiyiliftje.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YKWxBaHXQ_ygDCFypLHCQA_Bc9A1eGB';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  global: { fetch: fetch },
  realtime: { transport: WebSocket }
});

const MOCK_ACTIVITIES = [
  { category: 'food', text: 'Had a large beef burger for lunch', co2_kg: 3.5 },
  { category: 'food', text: 'Ate a vegetarian salad bowl', co2_kg: 0.3 },
  { category: 'transport', text: 'Drove my SUV 20 miles to work', co2_kg: 8.2 },
  { category: 'transport', text: 'Took the train for 15 miles', co2_kg: 1.5 },
  { category: 'energy', text: 'Left the AC running all night', co2_kg: 4.8 },
  { category: 'energy', text: 'Used the dishwasher and washing machine', co2_kg: 1.2 },
  { category: 'shopping', text: 'Bought 3 fast fashion t-shirts', co2_kg: 15.0 },
  { category: 'shopping', text: 'Purchased a new smartphone', co2_kg: 55.0 },
  { category: 'travel', text: 'Took a domestic flight (short haul)', co2_kg: 120.0 },
  { category: 'food', text: 'Drank 2 cups of coffee with dairy milk', co2_kg: 0.8 },
  { category: 'transport', text: 'Rode a bicycle to the grocery store', co2_kg: 0.0 },
  { category: 'shopping', text: 'Bought locally sourced groceries', co2_kg: 0.5 },
];

async function seed() {
  console.log('Logging in...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: '18gietuece045@gmail.com',
    password: 'Test@1234566'
  });

  if (authErr) {
    console.error('Login failed:', authErr.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log('Logged in as:', userId);

  console.log('Inserting activities...');
  const inserts = MOCK_ACTIVITIES.map((act, i) => {
    // Spread them across the last 7 days
    const date = new Date();
    date.setDate(date.getDate() - (i % 7));
    return {
      user_id: userId,
      category: act.category,
      activity: act.text,
      co2_kg: act.co2_kg,
      quantity: 1,
      unit: 'unit',
      logged_at: date.toISOString()
    };
  });

  const { error: insertErr } = await supabase.from('activities').insert(inserts);
  
  if (insertErr) {
    console.error('Insertion failed:', insertErr.message);
    process.exit(1);
  }

  console.log('Successfully seeded 12 activities across various categories!');
}

seed();
