import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/services/database.types.ts';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function runSmokeTest() {
  console.log('🚀 Starting Phase 2 Manual Smoke Test...');
  console.log(`Connecting to: ${SUPABASE_URL}`);

  // Create two separate client instances to simulate two distinct browsers/sessions
  const client1 = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const client2 = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const timestamp = Date.now();
  const user1Email = `smoke.user1.${timestamp}@example.com`;
  const user2Email = `smoke.user2.${timestamp}@example.com`;
  const password = 'Password123!';

  // 1. Sign up User 1
  console.log(`\n1. Signing up User 1 (${user1Email})...`);
  const signUp1 = await client1.auth.signUp({
    email: user1Email,
    password,
    options: { data: { display_name: 'Smoke User 1' } },
  });
  if (signUp1.error) throw new Error(`User 1 signup failed: ${signUp1.error.message}`);
  const user1Id = signUp1.data.user!.id;
  console.log(`   ✅ User 1 created with ID: ${user1Id}`);

  // 2. Sign up User 2
  console.log(`\n2. Signing up User 2 (${user2Email})...`);
  const signUp2 = await client2.auth.signUp({
    email: user2Email,
    password,
    options: { data: { display_name: 'Smoke User 2' } },
  });
  if (signUp2.error) throw new Error(`User 2 signup failed: ${signUp2.error.message}`);
  const user2Id = signUp2.data.user!.id;
  console.log(`   ✅ User 2 created with ID: ${user2Id}`);

  // 3. User 1 saves baseline profile
  console.log('\n3. User 1 saves baseline profile...');
  const { data: base1, error: base1Err } = await client1
    .from('baseline_profiles')
    .insert({
      user_id: user1Id,
      effective_from: '2026-09-20',
      household_size: 3,
      shower_minutes_per_day: 12,
      shower_heater: 'electric',
      ac_hours_per_day: 6,
      fan_hours_per_day: 8,
      laptop_hours_per_day: 7,
      laundry_loads_per_week: 4,
      laundry_machine: 'frontLoad',
      factors_version: '1.0.0',
    })
    .select()
    .single();

  if (base1Err) throw new Error(`User 1 baseline insert failed: ${base1Err.message}`);
  console.log(`   ✅ User 1 baseline saved successfully (ID: ${base1.id})`);

  // 4. User 2 saves baseline profile
  console.log('\n4. User 2 saves baseline profile...');
  const { data: base2, error: base2Err } = await client2
    .from('baseline_profiles')
    .insert({
      user_id: user2Id,
      effective_from: '2026-09-20',
      household_size: 1,
      shower_minutes_per_day: 7,
      shower_heater: 'none',
      ac_hours_per_day: 2,
      fan_hours_per_day: 4,
      laptop_hours_per_day: 8,
      laundry_loads_per_week: 2,
      laundry_machine: 'topLoad',
      factors_version: '1.0.0',
    })
    .select()
    .single();

  if (base2Err) throw new Error(`User 2 baseline insert failed: ${base2Err.message}`);
  console.log(`   ✅ User 2 baseline saved successfully (ID: ${base2.id})`);

  // 5. User 2 attempts to read User 1's baseline
  console.log("\n5. User 2 attempts to query User 1's baseline rows...");
  const { data: user2ReadUser1Base, error: readErr } = await client2
    .from('baseline_profiles')
    .select('*')
    .eq('user_id', user1Id);

  if (readErr) throw new Error(`Query failed: ${readErr.message}`);
  console.log(`   User 2 received rows count: ${user2ReadUser1Base.length}`);
  if (user2ReadUser1Base.length !== 0) {
    throw new Error('RLS VIOLATION: User 2 was able to read User 1 rows!');
  }
  console.log("   ✅ User 2 cannot read User 1's baseline rows (0 rows returned by RLS)");

  // 6. User 2 attempts to read User 1's profile
  console.log("\n6. User 2 attempts to query User 1's profile row...");
  const { data: user2ReadUser1Profile } = await client2
    .from('profiles')
    .select('*')
    .eq('id', user1Id);

  if ((user2ReadUser1Profile?.length || 0) !== 0) {
    throw new Error('RLS VIOLATION: User 2 was able to read User 1 profile!');
  }
  console.log("   ✅ User 2 cannot read User 1's profile (0 rows returned by RLS)");

  // 7. User 2 attempts to spoof User 1's user_id in an insert
  console.log("\n7. User 2 attempts to spoof User 1's user_id in baseline insert...");
  const { error: spoofErr } = await client2
    .from('baseline_profiles')
    .insert({
      user_id: user1Id, // SPOOFING
      effective_from: '2026-09-21',
      household_size: 1,
      shower_minutes_per_day: 5,
      shower_heater: 'none',
      ac_hours_per_day: 0,
      fan_hours_per_day: 0,
      laptop_hours_per_day: 0,
      laundry_loads_per_week: 1,
      laundry_machine: 'topLoad',
      factors_version: '1.0.0',
    });

  if (!spoofErr) {
    throw new Error('RLS VIOLATION: User 2 was able to insert a row spoofing User 1 user_id!');
  }
  console.log(`   ✅ Spoofed insert blocked by RLS: ${spoofErr.message}`);

  // 8. Factor sets public read
  console.log('\n8. Anonymous user reads factor_sets (no auth)...');
  const anonClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: factors, error: factorErr } = await anonClient
    .from('factor_sets')
    .select('version, region')
    .limit(1);

  if (factorErr || !factors || factors.length === 0) {
    throw new Error(`Anon factor read failed: ${factorErr?.message}`);
  }
  console.log(`   ✅ Anon user can read factor sets: version ${factors[0].version} (${factors[0].region})`);

  console.log('\n🎉 ALL SMOKE TESTS PASSED CLEANLY!\n');
}

runSmokeTest().catch((err) => {
  console.error('\n❌ Smoke test failed:', err);
  process.exit(1);
});
