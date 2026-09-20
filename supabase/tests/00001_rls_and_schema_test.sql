begin;
select plan(21);

-- 1. Assert RLS is enabled on all public tables
select set_eq(
  $$ select tablename::text from pg_tables where schemaname = 'public' and rowsecurity = true $$,
  array['baseline_profiles', 'deviations', 'factor_sets', 'goals', 'profiles']::text[],
  'All public tables must have row-level security enabled'
);

-- Setup test users in auth.users
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user.a@example.com', 'dummy_hash', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Alice"}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user.b@example.com', 'dummy_hash', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Bob"}', now(), now());

-- 2. Verify trigger created profile for User A and User B
select is(
  (select count(*) from public.profiles where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222') and display_name in ('Alice', 'Bob')),
  2::bigint,
  'Trigger handle_new_user automatically creates profile rows on auth.users insert'
);

-- 3. Anonymous user tests
set local role anon;
set local "request.jwt.claim.role" = 'anon';

-- Anon can read factor_sets
select ok(
  (select count(*) >= 1 from public.factor_sets),
  'Anon role can read factor_sets'
);

-- Anon cannot write to factor_sets
select throws_ok(
  $$ insert into public.factor_sets (version, region, effective_from, payload) values ('9.9.9', 'test', '2026-01-01', '{}'::jsonb) $$,
  '42501',
  NULL,
  'Anon role cannot insert into factor_sets'
);

-- Anon cannot read profiles (denied by permissions)
select throws_ok(
  $$ select * from public.profiles $$,
  '42501',
  NULL,
  'Anon role cannot read profiles (permission denied)'
);

-- Anon cannot read baseline_profiles
select throws_ok(
  $$ select * from public.baseline_profiles $$,
  '42501',
  NULL,
  'Anon role cannot read baseline_profiles (permission denied)'
);

-- Anon cannot read deviations
select throws_ok(
  $$ select * from public.deviations $$,
  '42501',
  NULL,
  'Anon role cannot read deviations (permission denied)'
);

-- 4. Authenticated User A operations
set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
set local "request.jwt.claim.role" = 'authenticated';

-- User A reads own profile
select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Alice',
  'User A can read own profile'
);

-- User A inserts a baseline
select lives_ok(
  $$ insert into public.baseline_profiles (user_id, effective_from, household_size, shower_minutes_per_day, shower_heater, ac_hours_per_day, fan_hours_per_day, laptop_hours_per_day, laundry_loads_per_week, laundry_machine, factors_version)
     values ('11111111-1111-1111-1111-111111111111', '2026-01-01', 2, 10, 'electric', 4, 8, 6, 3, 'frontLoad', '1.0.0') $$,
  'User A can insert own baseline profile'
);

-- User A inserts a deviation
select lives_ok(
  $$ insert into public.deviations (user_id, start_date, end_date, field, mode, value, note)
     values ('11111111-1111-1111-1111-111111111111', '2026-01-05', '2026-01-07', 'ac_hours_per_day', 'delta', 3, 'Heatwave') $$,
  'User A can insert own deviation'
);

-- 5. Cross-user isolation: Switch to User B
set local role authenticated;
set local "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';
set local "request.jwt.claim.role" = 'authenticated';

-- User B cannot see User A's profile (sees only own)
select is(
  (select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'User B cannot see User A profile'
);

-- User B cannot see User A's baseline_profiles
select is_empty(
  $$ select * from public.baseline_profiles where user_id = '11111111-1111-1111-1111-111111111111' $$,
  'User B cannot select User A baseline profile'
);

-- User B cannot see User A's deviations
select is_empty(
  $$ select * from public.deviations where user_id = '11111111-1111-1111-1111-111111111111' $$,
  'User B cannot select User A deviations'
);

-- User B cannot insert a baseline spoofing User A's user_id
select throws_ok(
  $$ insert into public.baseline_profiles (user_id, effective_from, household_size, shower_minutes_per_day, shower_heater, ac_hours_per_day, fan_hours_per_day, laptop_hours_per_day, laundry_loads_per_week, laundry_machine, factors_version)
     values ('11111111-1111-1111-1111-111111111111', '2026-01-02', 1, 5, 'none', 0, 0, 0, 1, 'topLoad', '1.0.0') $$,
  '42501',
  NULL,
  'User B cannot insert baseline with User A user_id (RLS WITH CHECK violation)'
);

-- User B cannot update User A's baseline (affects 0 rows)
select lives_ok(
  $$ update public.baseline_profiles set shower_minutes_per_day = 99 where user_id = '11111111-1111-1111-1111-111111111111' $$,
  'Update statement on other user rows executes without error but touches 0 rows'
);

-- 6. CHECK constraints validation
reset role;

-- Constraint: Negative shower minutes rejected
select throws_ok(
  $$ insert into public.baseline_profiles (user_id, effective_from, household_size, shower_minutes_per_day, shower_heater, ac_hours_per_day, fan_hours_per_day, laptop_hours_per_day, laundry_loads_per_week, laundry_machine, factors_version)
     values ('22222222-2222-2222-2222-222222222222', '2026-01-01', 1, -5, 'none', 0, 0, 0, 1, 'topLoad', '1.0.0') $$,
  '23514',
  NULL,
  'Negative shower minutes rejected by CHECK constraint'
);

-- Constraint: AC hours > 24 rejected
select throws_ok(
  $$ insert into public.baseline_profiles (user_id, effective_from, household_size, shower_minutes_per_day, shower_heater, ac_hours_per_day, fan_hours_per_day, laptop_hours_per_day, laundry_loads_per_week, laundry_machine, factors_version)
     values ('22222222-2222-2222-2222-222222222222', '2026-01-01', 1, 10, 'none', 25, 0, 0, 1, 'topLoad', '1.0.0') $$,
  '23514',
  NULL,
  'AC hours > 24 rejected by CHECK constraint'
);

-- Constraint: Household size 0 rejected
select throws_ok(
  $$ insert into public.baseline_profiles (user_id, effective_from, household_size, shower_minutes_per_day, shower_heater, ac_hours_per_day, fan_hours_per_day, laptop_hours_per_day, laundry_loads_per_week, laundry_machine, factors_version)
     values ('22222222-2222-2222-2222-222222222222', '2026-01-01', 0, 10, 'none', 5, 0, 0, 1, 'topLoad', '1.0.0') $$,
  '23514',
  NULL,
  'Household size 0 rejected by CHECK constraint'
);

-- Constraint: end_date before start_date in deviations rejected
select throws_ok(
  $$ insert into public.deviations (user_id, start_date, end_date, field, mode, value)
     values ('22222222-2222-2222-2222-222222222222', '2026-01-10', '2026-01-05', 'ac_hours_per_day', 'delta', 1) $$,
  '23514',
  NULL,
  'Deviation end_date before start_date rejected by CHECK constraint'
);

-- 7. Unique (user_id, effective_from) constraint
select throws_ok(
  $$ insert into public.baseline_profiles (user_id, effective_from, household_size, shower_minutes_per_day, shower_heater, ac_hours_per_day, fan_hours_per_day, laptop_hours_per_day, laundry_loads_per_week, laundry_machine, factors_version)
     values ('11111111-1111-1111-1111-111111111111', '2026-01-01', 2, 15, 'electric', 5, 5, 5, 2, 'topLoad', '1.0.0') $$,
  '23505',
  NULL,
  'Duplicate baseline for same user and same effective_from rejected by UNIQUE constraint'
);

-- 8. Cascade delete on auth.users deletion
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';

select ok(
  (select count(*) = 0 from public.profiles where id = '11111111-1111-1111-1111-111111111111') and
  (select count(*) = 0 from public.baseline_profiles where user_id = '11111111-1111-1111-1111-111111111111') and
  (select count(*) = 0 from public.deviations where user_id = '11111111-1111-1111-1111-111111111111'),
  'Deleting auth user cascades to profiles, baseline_profiles, and deviations'
);

select * from finish();
rollback;
