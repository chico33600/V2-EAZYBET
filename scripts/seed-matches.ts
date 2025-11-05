import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const testMatches = [
  {
    team_a: 'PSG',
    team_b: 'Marseille',
    league: 'Ligue 1',
    odds_a: 1.85,
    odds_draw: 3.40,
    odds_b: 4.20,
    match_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'upcoming',
  },
  {
    team_a: 'Lyon',
    team_b: 'Monaco',
    league: 'Ligue 1',
    odds_a: 2.30,
    odds_draw: 3.20,
    odds_b: 3.10,
    match_date: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    status: 'upcoming',
  },
  {
    team_a: 'Manchester City',
    team_b: 'Liverpool',
    league: 'Premier League',
    odds_a: 2.10,
    odds_draw: 3.50,
    odds_b: 3.40,
    match_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    status: 'upcoming',
  },
  {
    team_a: 'Real Madrid',
    team_b: 'Barcelona',
    league: 'La Liga',
    odds_a: 2.25,
    odds_draw: 3.30,
    odds_b: 3.00,
    match_date: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    status: 'upcoming',
  },
  {
    team_a: 'Bayern Munich',
    team_b: 'Borussia Dortmund',
    league: 'Bundesliga',
    odds_a: 1.95,
    odds_draw: 3.60,
    odds_b: 3.80,
    match_date: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    status: 'upcoming',
  },
  {
    team_a: 'Juventus',
    team_b: 'Inter Milan',
    league: 'Serie A',
    odds_a: 2.40,
    odds_draw: 3.10,
    odds_b: 2.90,
    match_date: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    status: 'upcoming',
  },
  {
    team_a: 'Arsenal',
    team_b: 'Chelsea',
    league: 'Premier League',
    odds_a: 2.15,
    odds_draw: 3.40,
    odds_b: 3.30,
    match_date: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    status: 'upcoming',
  },
  {
    team_a: 'Atletico Madrid',
    team_b: 'Sevilla',
    league: 'La Liga',
    odds_a: 1.90,
    odds_draw: 3.50,
    odds_b: 4.00,
    match_date: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString(),
    status: 'upcoming',
  },
];

async function seedMatches() {
  console.log('Seeding test matches...');

  const { data, error } = await supabase
    .from('matches')
    .insert(testMatches)
    .select();

  if (error) {
    console.error('Error seeding matches:', error);
    process.exit(1);
  }

  console.log(`Successfully seeded ${data?.length || 0} matches!`);
  console.log('Matches:', data);
  process.exit(0);
}

seedMatches();
