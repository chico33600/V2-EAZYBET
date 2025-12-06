/**
 * Script de diagnostic simple pour tester l'API leaderboard
 * Lance: node scripts/test-leaderboard-simple.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eoadmnhdvbrxatdgcsft.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYWRtbmhkdmJyeGF0ZGdjc2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTk5NTIsImV4cCI6MjA3NzkzNTk1Mn0.5cA06KgQQ5I6mC1RzZFG7zQ1kQePGIPGL0GqoaLBuEw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('=== TEST LEADERBOARD API ===\n');

console.log('1. Testing get_leaderboard RPC function directly...');
const { data: rpcData, error: rpcError } = await supabase
  .rpc('get_leaderboard', {
    limit_input: 10,
    offset_input: 0
  });

if (rpcError) {
  console.error('❌ RPC Error:', rpcError);
} else {
  console.log(`✅ RPC returned ${rpcData?.length || 0} entries`);
  if (rpcData && rpcData.length > 0) {
    console.log('First entry:', JSON.stringify(rpcData[0], null, 2));
    console.log('All entries summary:');
    rpcData.forEach((entry, i) => {
      console.log(`  ${i + 1}. Rank ${entry.rank}: ${entry.username} - ${entry.leaderboard_score} diamonds`);
    });
  } else {
    console.log('⚠️ No entries returned!');
  }
}

console.log('\n2. Testing profiles table direct query...');
const { data: profilesData, error: profilesError } = await supabase
  .from('profiles')
  .select('id, username, leaderboard_score')
  .order('leaderboard_score', { ascending: false })
  .limit(10);

if (profilesError) {
  console.error('❌ Profiles Error:', profilesError);
} else {
  console.log(`✅ Direct query returned ${profilesData?.length || 0} profiles`);
  if (profilesData && profilesData.length > 0) {
    profilesData.forEach((profile, i) => {
      console.log(`  ${i + 1}. ${profile.username} - ${profile.leaderboard_score} diamonds`);
    });
  }
}

console.log('\n3. Testing total count...');
const { count, error: countError } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true });

if (countError) {
  console.error('❌ Count Error:', countError);
} else {
  console.log(`✅ Total profiles in database: ${count}`);
}

console.log('\n=== END TEST ===');
