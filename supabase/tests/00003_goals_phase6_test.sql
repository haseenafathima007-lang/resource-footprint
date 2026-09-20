-- pgTAP Test: 00003_goals_phase6_test.sql
-- Validates Phase 6 goals table schema, constraints, partial unique index, and RLS policies.

begin;
select plan(30);

-- ==========================================
-- 1. Schema & RLS Verification
-- ==========================================

select has_table('public', 'goals', 'Table public.goals exists');
select has_column('public', 'goals', 'id', 'Column id exists');
select has_column('public', 'goals', 'user_id', 'Column user_id exists');
select has_column('public', 'goals', 'resource', 'Column resource exists');
select has_column('public', 'goals', 'period', 'Column period exists');
select has_column('public', 'goals', 'target_amount', 'Column target_amount exists');
select has_column('public', 'goals', 'start_date', 'Column start_date exists');
select has_column('public', 'goals', 'reference_profile', 'Column reference_profile exists');
select has_column('public', 'goals', 'status', 'Column status exists');
select has_column('public', 'goals', 'created_at', 'Column created_at exists');
select has_column('public', 'goals', 'updated_at', 'Column updated_at exists');

-- Verify RLS is enabled
select row_security_active('public.goals');

-- ==========================================
-- 2. Setup Test Users
-- ==========================================

create extension if not exists pgcrypto;

insert into auth.users (id, email, raw_user_meta_data)
values 
  ('11111111-1111-1111-1111-111111111111', 'user_a_p6@example.com', '{"name": "User A"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'user_b_p6@example.com', '{"name": "User B"}'::jsonb)
on conflict (id) do nothing;

-- ==========================================
-- 3. CHECK Constraints Testing (Exact Boundaries)
-- ==========================================

-- Target amount > 0 and <= 1000000
select throws_ok(
  $$
    insert into public.goals (user_id, resource, period, target_amount, start_date, reference_profile)
    values ('11111111-1111-1111-1111-111111111111', 'water', 'week', 0, '2026-09-01', '{"householdSize": 1}'::jsonb);
  $$,
  '23514',
  null,
  'Target amount 0 is rejected by check constraint'
);

select throws_ok(
  $$
    insert into public.goals (user_id, resource, period, target_amount, start_date, reference_profile)
    values ('11111111-1111-1111-1111-111111111111', 'water', 'week', 1000000.01, '2026-09-01', '{"householdSize": 1}'::jsonb);
  $$,
  '23514',
  null,
  'Target amount 1000000.01 is rejected by check constraint'
);

-- Resource check in ('water', 'energy')
select throws_ok(
  $$
    insert into public.goals (user_id, resource, period, target_amount, start_date, reference_profile)
    values ('11111111-1111-1111-1111-111111111111', 'gas', 'week', 100, '2026-09-01', '{"householdSize": 1}'::jsonb);
  $$,
  '23514',
  null,
  'Invalid resource "gas" is rejected'
);

-- Period check in ('week', 'month')
select throws_ok(
  $$
    insert into public.goals (user_id, resource, period, target_amount, start_date, reference_profile)
    values ('11111111-1111-1111-1111-111111111111', 'water', 'year', 100, '2026-09-01', '{"householdSize": 1}'::jsonb);
  $$,
  '23514',
  null,
  'Invalid period "year" is rejected'
);

-- Status check in ('active', 'archived')
select throws_ok(
  $$
    insert into public.goals (user_id, resource, period, target_amount, start_date, reference_profile, status)
    values ('11111111-1111-1111-1111-111111111111', 'water', 'week', 100, '2026-09-01', '{"householdSize": 1}'::jsonb, 'completed');
  $$,
  '23514',
  null,
  'Invalid status "completed" is rejected'
);

-- reference_profile must be jsonb object (not array or scalar)
select throws_ok(
  $$
    insert into public.goals (user_id, resource, period, target_amount, start_date, reference_profile)
    values ('11111111-1111-1111-1111-111111111111', 'water', 'week', 100, '2026-09-01', '["not", "an", "object"]'::jsonb);
  $$,
  '23514',
  null,
  'Non-object jsonb reference_profile is rejected'
);

-- Valid inserts at lower (0.01) and upper (1000000) target bounds
select lives_ok(
  $$
    insert into public.goals (id, user_id, resource, period, target_amount, start_date, reference_profile)
    values 
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'water', 'week', 0.01, '2026-09-01', '{"householdSize": 1}'::jsonb),
      ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'energy', 'month', 1000000, '2026-09-01', '{"householdSize": 1}'::jsonb);
  $$,
  'Exact edge values (0.01 and 1000000) are accepted'
);

-- ==========================================
-- 4. Partial Unique Index Testing
-- ==========================================

-- Attempting second active water-week goal for User A
select throws_ok(
  $$
    insert into public.goals (user_id, resource, period, target_amount, start_date, reference_profile)
    values ('11111111-1111-1111-1111-111111111111', 'water', 'week', 200, '2026-09-05', '{"householdSize": 1}'::jsonb);
  $$,
  '23505',
  null,
  'Second active goal for same resource and period is rejected by partial unique index'
);

-- Different period for same resource (water month) is allowed
select lives_ok(
  $$
    insert into public.goals (id, user_id, resource, period, target_amount, start_date, reference_profile)
    values ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'water', 'month', 500, '2026-09-01', '{"householdSize": 1}'::jsonb);
  $$,
  'Different period for same resource is allowed'
);

-- After archiving the active goal, a new active goal can be created
select lives_ok(
  $$
    update public.goals set status = 'archived' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    insert into public.goals (id, user_id, resource, period, target_amount, start_date, reference_profile)
    values ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'water', 'week', 250, '2026-09-10', '{"householdSize": 1}'::jsonb);
  $$,
  'New active goal allowed after archiving previous goal for same resource and period'
);

-- ==========================================
-- 5. Cross-User RLS Isolation
-- ==========================================

-- As User B: cannot see User A's goals
set local role authenticated;
set local "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';

select is_empty(
  $$ select * from public.goals where user_id = '11111111-1111-1111-1111-111111111111' $$,
  'User B cannot select User A goals'
);

-- User B cannot insert goal for User A
select throws_ok(
  $$
    insert into public.goals (user_id, resource, period, target_amount, start_date, reference_profile)
    values ('11111111-1111-1111-1111-111111111111', 'energy', 'week', 50, '2026-09-01', '{"householdSize": 1}'::jsonb);
  $$,
  '42501',
  null,
  'User B cannot insert goals with User A user_id'
);

-- User B cannot update User A's goals
select is_empty(
  $$ update public.goals set target_amount = 999 where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' returning *; $$,
  'User B cannot update User A goals'
);

-- User B cannot delete User A's goals
select is_empty(
  $$ delete from public.goals where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' returning *; $$,
  'User B cannot delete User A goals'
);

-- User B CAN create their own goal
select lives_ok(
  $$
    insert into public.goals (id, user_id, resource, period, target_amount, start_date, reference_profile)
    values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'water', 'week', 150, '2026-09-01', '{"householdSize": 1}'::jsonb);
  $$,
  'User B can insert their own goal'
);

-- ==========================================
-- 6. Anon Role Isolation
-- ==========================================

set local role anon;
set local "request.jwt.claim.sub" = '';

select throws_ok(
  $$ select * from public.goals $$,
  '42501',
  null,
  'Anon role cannot read from public.goals'
);

select throws_ok(
  $$ insert into public.goals (user_id, resource, period, target_amount, start_date, reference_profile) values ('11111111-1111-1111-1111-111111111111', 'water', 'week', 50, '2026-09-01', '{"householdSize": 1}'::jsonb) $$,
  '42501',
  null,
  'Anon role cannot write to public.goals'
);

-- ==========================================
-- 7. Cascade Delete Verification
-- ==========================================

set local role postgres;

select lives_ok(
  $$
    delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
  $$,
  'Deleting auth user cascades to goals'
);

select is_empty(
  $$ select * from public.goals where user_id = '22222222-2222-2222-2222-222222222222' $$,
  'Goals belonging to deleted user are removed via cascade'
);

select * from finish();
rollback;
