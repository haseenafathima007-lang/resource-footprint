begin;
select plan(36);

-- Setup 4 test users in auth.users
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user.a@example.com', 'dummy_hash', now(), '{"provider":"email"}', '{"display_name":"Alice"}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user.b@example.com', 'dummy_hash', now(), '{"provider":"email"}', '{"display_name":"Bob"}', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user.c@example.com', 'dummy_hash', now(), '{"provider":"email"}', '{"display_name":"Charlie"}', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user.d@example.com', 'dummy_hash', now(), '{"provider":"email"}', '{"display_name":"David"}', now(), now());

-- 1. Assert RLS is enabled on all 3 new tables
select is(
  (select count(*) from pg_tables where schemaname = 'public' and tablename in ('teams', 'team_members', 'team_contributions') and rowsecurity = true),
  3::bigint,
  'RLS must be enabled on teams, team_members, and team_contributions'
);

-- 2. Direct table SELECT permissions check for authenticated users (own rows only)
set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
set local "request.jwt.claim.role" = 'authenticated';

select throws_ok(
  $$ select * from public.teams $$,
  '42501',
  NULL,
  'Authenticated users cannot directly SELECT from teams table'
);

-- 3. User A creates team
select lives_ok(
  $$ select public.create_team('Eco Warriors', 'AliceEco', '{"householdSize":1}'::jsonb, 164.2857, 8.6986, 'water', 500) $$,
  'User A can create a team'
);

-- Extract created team details
create temp table _test_vars as
select
  (public.get_my_teams()->0->>'id')::uuid as team_id,
  public.get_my_teams()->0->>'join_code' as join_code;

-- 4. User A (owner) join_code is visible, member list accessible
select is(
  (select count(*) from public.get_my_teams()),
  1::bigint,
  'User A has 1 team'
);

-- 5. User B attempts to join with wrong code
set local role authenticated;
set local "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';
set local "request.jwt.claim.role" = 'authenticated';

select throws_ok(
  $$ select public.join_team('WRONGCODE10', 'BobEco', '{"householdSize":1}'::jsonb, 164.2857, 8.6986) $$,
  'P0001',
  'INVALID_CODE',
  'Joining with wrong code throws INVALID_CODE'
);

-- 6. User B (non-member) calling functions on A team gets NOT_FOUND
select throws_ok(
  format($$ select public.get_team_members('%s'::uuid) $$, (select team_id from _test_vars)),
  'P0001',
  'NOT_FOUND',
  'Non-member calling get_team_members gets NOT_FOUND'
);

-- 7. User B joins team correctly
select lives_ok(
  format($$ select public.join_team('%s', 'BobEco', '{"householdSize":1}'::jsonb, 164.2857, 8.6986) $$, (select join_code from _test_vars)),
  'User B can join team with valid code'
);

-- 8. User C joins team correctly
set local role authenticated;
set local "request.jwt.claim.sub" = '33333333-3333-3333-3333-333333333333';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  format($$ select public.join_team('%s', 'CharlieEco', '{"householdSize":1}'::jsonb, 164.2857, 8.6986) $$, (select join_code from _test_vars)),
  'User C can join team with valid code'
);

-- 9. Duplicate join attempt throws CONFLICT
select throws_ok(
  format($$ select public.join_team('%s', 'Charlie2', '{"householdSize":1}'::jsonb, 164.2857, 8.6986) $$, (select join_code from _test_vars)),
  'P0001',
  'CONFLICT',
  'Already member joining again throws CONFLICT'
);

-- 10. User D joins team with duplicate alias throws CONFLICT
set local role authenticated;
set local "request.jwt.claim.sub" = '44444444-4444-4444-4444-444444444444';
set local "request.jwt.claim.role" = 'authenticated';

select throws_ok(
  format($$ select public.join_team('%s', 'charlieeco', '{"householdSize":1}'::jsonb, 164.2857, 8.6986) $$, (select join_code from _test_vars)),
  'P0001',
  'CONFLICT',
  'Joining with duplicate alias (case insensitive) throws CONFLICT'
);

-- 11. Plain member trying owner-only function rotate_code throws NOT_FOUND
select throws_ok(
  format($$ select public.rotate_code('%s'::uuid) $$, (select team_id from _test_vars)),
  'P0001',
  'NOT_FOUND',
  'Non-owner calling rotate_code throws NOT_FOUND'
);

-- 12. Sharing default is false; team summary is NOT visible (<3 sharing members)
set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
set local "request.jwt.claim.role" = 'authenticated';

select is(
  (public.get_team_summary((select team_id from _test_vars))->>'visible')::boolean,
  false,
  'Team summary is not visible when sharing_count < 3'
);

select is(
  (public.get_team_summary((select team_id from _test_vars))->>'total_water_saved_l'),
  NULL,
  'Team summary totals are NULL when not visible'
);

-- 13. Enable sharing for A, B, and C
select lives_ok(
  format($$ select public.update_my_membership('%s'::uuid, 'AliceEco', true) $$, (select team_id from _test_vars)),
  'User A enables sharing'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  format($$ select public.update_my_membership('%s'::uuid, 'BobEco', true) $$, (select team_id from _test_vars)),
  'User B enables sharing'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '33333333-3333-3333-3333-333333333333';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  format($$ select public.update_my_membership('%s'::uuid, 'CharlieEco', true) $$, (select team_id from _test_vars)),
  'User C enables sharing'
);

-- 14. Now sharing_count = 3 -> team summary is visible!
select is(
  (public.get_team_summary((select team_id from _test_vars))->>'visible')::boolean,
  true,
  'Team summary becomes visible when 3 members share'
);

-- 15. Upsert contributions for A, B, C (3 days each)
-- A: 27 L, 0.783 kWh/day
set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  format($$ select public.upsert_my_contributions('%s'::uuid, '[
    {"day": "%s", "water_saved_l": 27.0, "energy_saved_kwh": 0.783},
    {"day": "%s", "water_saved_l": 27.0, "energy_saved_kwh": 0.783},
    {"day": "%s", "water_saved_l": 27.0, "energy_saved_kwh": 0.783}
  ]'::jsonb) $$, (select team_id from _test_vars), (current_date - 2)::text, (current_date - 1)::text, current_date::text),
  'User A upserts 3 contribution days'
);

-- B: 18 L, 0.522 kWh/day
set local role authenticated;
set local "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  format($$ select public.upsert_my_contributions('%s'::uuid, '[
    {"day": "%s", "water_saved_l": 18.0, "energy_saved_kwh": 0.522},
    {"day": "%s", "water_saved_l": 18.0, "energy_saved_kwh": 0.522},
    {"day": "%s", "water_saved_l": 18.0, "energy_saved_kwh": 0.522}
  ]'::jsonb) $$, (select team_id from _test_vars), (current_date - 2)::text, (current_date - 1)::text, current_date::text),
  'User B upserts 3 contribution days'
);

-- C: 9 L, 0.261 kWh/day
set local role authenticated;
set local "request.jwt.claim.sub" = '33333333-3333-3333-3333-333333333333';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  format($$ select public.upsert_my_contributions('%s'::uuid, '[
    {"day": "%s", "water_saved_l": 9.0, "energy_saved_kwh": 0.261},
    {"day": "%s", "water_saved_l": 9.0, "energy_saved_kwh": 0.261},
    {"day": "%s", "water_saved_l": 9.0, "energy_saved_kwh": 0.261}
  ]'::jsonb) $$, (select team_id from _test_vars), (current_date - 2)::text, (current_date - 1)::text, current_date::text),
  'User C upserts 3 contribution days'
);

-- 16. Verify Hand-computed Team Totals:
-- Water: (27 + 18 + 9) * 3 = 162.0 L
-- Energy: (0.783 + 0.522 + 0.261) * 3 = 4.698 kWh
select is(
  (public.get_team_summary((select team_id from _test_vars))->>'total_water_saved_l')::numeric,
  162.00::numeric,
  'Team water saved total equals hand-computed 162.00 L'
);

select is(
  (public.get_team_summary((select team_id from _test_vars))->>'total_energy_saved_kwh')::numeric,
  4.698::numeric,
  'Team energy saved total equals hand-computed 4.698 kWh'
);

-- 17. Leaderboard when show_leaderboard = false -> returns []
select is(
  public.get_leaderboard((select team_id from _test_vars)),
  '[]'::jsonb,
  'Leaderboard returns [] when show_leaderboard = false'
);

-- 18. Enable leaderboard as owner (User A)
set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  format($$ select public.update_team_settings('%s'::uuid, true, 'water', 500) $$, (select team_id from _test_vars)),
  'Owner enables leaderboard'
);

-- 19. Verify Hand-computed Leaderboard values:
-- Ranks 1, 2, 3 with exact percents:
-- A: pct_water=16, pct_energy=9, pct_overall=13, rank=1
-- B: pct_water=11, pct_energy=6, pct_overall=9, rank=2 (round((11+6)/2.0) = 9)
-- C: pct_water=5, pct_energy=3, pct_overall=4, rank=3
-- Verify NO user_id column in JSON result.
select is(
  (public.get_leaderboard((select team_id from _test_vars))->0->>'alias'),
  'AliceEco',
  'Leaderboard rank 1 alias is AliceEco'
);

select is(
  (public.get_leaderboard((select team_id from _test_vars))->0->>'pct_overall')::numeric,
  13::numeric,
  'Leaderboard rank 1 overall percentage is 13%'
);

select is(
  (public.get_leaderboard((select team_id from _test_vars))->1->>'pct_overall')::numeric,
  9::numeric,
  'Leaderboard rank 2 overall percentage is 9%'
);

select is(
  (public.get_leaderboard((select team_id from _test_vars))->2->>'pct_overall')::numeric,
  4::numeric,
  'Leaderboard rank 3 overall percentage is 4%'
);

select is(
  (public.get_leaderboard((select team_id from _test_vars))->0->'user_id'),
  NULL,
  'Leaderboard output contains NO user_id field'
);

-- 20. Out of bound date contribution rejection (40 days ago / 5 days ahead)
select throws_ok(
  format($$ select public.upsert_my_contributions('%s'::uuid, '[{"day": "%s", "water_saved_l": 10, "energy_saved_kwh": 1}]'::jsonb) $$, (select team_id from _test_vars), (current_date - 40)::text),
  'P0001',
  'VALIDATION',
  'Contributions older than 31 days throw VALIDATION'
);

select throws_ok(
  format($$ select public.upsert_my_contributions('%s'::uuid, '[{"day": "%s", "water_saved_l": 10, "energy_saved_kwh": 1}]'::jsonb) $$, (select team_id from _test_vars), (current_date + 5)::text),
  'P0001',
  'VALIDATION',
  'Contributions more than 1 day in future throw VALIDATION'
);

-- 21. Turning sharing OFF deletes user contributions
set local role authenticated;
set local "request.jwt.claim.sub" = '33333333-3333-3333-3333-333333333333';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  format($$ select public.update_my_membership('%s'::uuid, 'CharlieEco', false) $$, (select team_id from _test_vars)),
  'User C turns sharing OFF'
);

select is(
  (public.get_team_summary((select team_id from _test_vars))->>'visible')::boolean,
  false,
  'Team summary becomes invisible when sharing_count drops below 3'
);

-- 22. User B leaves team -> contributions deleted automatically
set local role authenticated;
set local "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  format($$ select public.leave_team('%s'::uuid) $$, (select team_id from _test_vars)),
  'User B leaves team'
);

-- 23. Owner rotates code -> new code generated, old code fails
set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  format($$ select public.rotate_code('%s'::uuid) $$, (select team_id from _test_vars)),
  'Owner can rotate join code'
);

-- 24. Owner deletes team -> cascading deletes team, members, contributions
select lives_ok(
  format($$ select public.delete_team('%s'::uuid) $$, (select team_id from _test_vars)),
  'Owner can delete team'
);

rollback;
