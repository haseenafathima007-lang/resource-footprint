begin;
select plan(23);

-- Setup test users in auth.users
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alice.phase5@example.com', 'dummy_hash', now(), '{"provider":"email"}', '{"display_name":"Alice Phase5"}', now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bob.phase5@example.com', 'dummy_hash', now(), '{"provider":"email"}', '{"display_name":"Bob Phase5"}', now(), now());

-- 1. Check constraints at exact edges and outside
set local role authenticated;
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local "request.jwt.claim.role" = 'authenticated';

-- AC override 24 ok
select lives_ok(
  $$ insert into public.deviations (id, user_id, start_date, end_date, field, mode, value)
     values ('d0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-06-01', '2026-06-01', 'ac_hours_per_day', 'override', 24) $$,
  'AC override 24 is allowed at upper bound'
);

-- AC override 24.5 rejected
select throws_ok(
  $$ insert into public.deviations (user_id, start_date, end_date, field, mode, value)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-06-01', '2026-06-01', 'ac_hours_per_day', 'override', 24.5) $$,
  '23514',
  NULL,
  'AC override 24.5 is rejected (exceeds max bound 24)'
);

-- Delta 0 rejected
select throws_ok(
  $$ insert into public.deviations (user_id, start_date, end_date, field, mode, value)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-06-01', '2026-06-01', 'ac_hours_per_day', 'delta', 0) $$,
  '23514',
  NULL,
  'Delta value 0 is rejected (must be non-zero)'
);

-- Delta 25 on AC rejected
select throws_ok(
  $$ insert into public.deviations (user_id, start_date, end_date, field, mode, value)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-06-01', '2026-06-01', 'ac_hours_per_day', 'delta', 25) $$,
  '23514',
  NULL,
  'AC delta 25 is rejected (abs value exceeds max 24)'
);

-- Delta 24 on AC ok
select lives_ok(
  $$ insert into public.deviations (user_id, start_date, end_date, field, mode, value)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-06-01', '2026-06-01', 'ac_hours_per_day', 'delta', 24) $$,
  'AC delta 24 is allowed at upper bound'
);

-- Shower override 120 ok
select lives_ok(
  $$ insert into public.deviations (user_id, start_date, end_date, field, mode, value)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-06-01', '2026-06-01', 'shower_minutes_per_day', 'override', 120) $$,
  'Shower override 120 is allowed at upper bound'
);

-- Shower override 120.1 rejected
select throws_ok(
  $$ insert into public.deviations (user_id, start_date, end_date, field, mode, value)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-06-01', '2026-06-01', 'shower_minutes_per_day', 'override', 120.1) $$,
  '23514',
  NULL,
  'Shower override 120.1 is rejected'
);

-- Shower delta -120 ok
select lives_ok(
  $$ insert into public.deviations (user_id, start_date, end_date, field, mode, value)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-06-01', '2026-06-01', 'shower_minutes_per_day', 'delta', -120) $$,
  'Shower delta -120 is allowed'
);

-- Shower delta -121 rejected
select throws_ok(
  $$ insert into public.deviations (user_id, start_date, end_date, field, mode, value)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-06-01', '2026-06-01', 'shower_minutes_per_day', 'delta', -121) $$,
  '23514',
  NULL,
  'Shower delta -121 is rejected'
);

-- Laundry override 50 ok
select lives_ok(
  $$ insert into public.deviations (user_id, start_date, end_date, field, mode, value)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-06-01', '2026-06-01', 'laundry_loads_per_week', 'override', 50) $$,
  'Laundry override 50 is allowed'
);

-- Laundry override 51 rejected
select throws_ok(
  $$ insert into public.deviations (user_id, start_date, end_date, field, mode, value)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-06-01', '2026-06-01', 'laundry_loads_per_week', 'override', 51) $$,
  '23514',
  NULL,
  'Laundry override 51 is rejected'
);

-- 365-day range ok (2026-01-01 to 2027-01-01 = 365 days)
select lives_ok(
  $$ insert into public.deviations (user_id, start_date, end_date, field, mode, value)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-01-01', '2027-01-01', 'ac_hours_per_day', 'override', 4) $$,
  'Date range of exactly 365 days is allowed'
);

-- 366-day range rejected (2026-01-01 to 2027-01-02 = 366 days)
select throws_ok(
  $$ insert into public.deviations (user_id, start_date, end_date, field, mode, value)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-01-01', '2027-01-02', 'ac_hours_per_day', 'override', 4) $$,
  '23514',
  NULL,
  'Date range of 366 days is rejected (exceeds max 365 days)'
);

-- 2. Anonymous user checks
set local role anon;
set local "request.jwt.claim.role" = 'anon';

-- Anon cannot read deviations
select throws_ok(
  $$ select * from public.deviations $$,
  '42501',
  NULL,
  'Anon cannot select deviations'
);

-- Anon cannot write deviations
select throws_ok(
  $$ insert into public.deviations (user_id, start_date, end_date, field, mode, value)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-06-01', '2026-06-01', 'ac_hours_per_day', 'delta', 2) $$,
  '42501',
  NULL,
  'Anon cannot insert deviations'
);

-- 3. Cross-User Isolation
-- User A inserts a deviation with group_id
set local role authenticated;
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  $$ insert into public.deviations (id, user_id, group_id, start_date, end_date, field, mode, value)
     values ('d0000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', '2026-07-01', '2026-07-03', 'fan_hours_per_day', 'delta', 2) $$,
  'User A can insert row with group_id'
);

-- Switch to User B
set local role authenticated;
set local "request.jwt.claim.sub" = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
set local "request.jwt.claim.role" = 'authenticated';

-- User B cannot select User A's deviations
select is(
  (select count(*) from public.deviations where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint,
  'User B cannot SELECT User A deviations (0 visible)'
);

-- User B cannot insert with User A's user_id
select throws_ok(
  $$ insert into public.deviations (user_id, start_date, end_date, field, mode, value)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-07-01', '2026-07-03', 'fan_hours_per_day', 'delta', 1) $$,
  '42501',
  NULL,
  'User B cannot insert deviation with User A user_id'
);

-- User B cannot attach rows to User A's group_id
select throws_ok(
  $$ insert into public.deviations (user_id, group_id, start_date, end_date, field, mode, value)
     values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '99999999-9999-9999-9999-999999999999', '2026-07-01', '2026-07-03', 'fan_hours_per_day', 'delta', 1) $$,
  '42501',
  NULL,
  'User B cannot attach rows to User A group_id'
);

-- User B cannot update User A's deviations
update public.deviations set value = 10 where id = 'd0000000-0000-0000-0000-000000000002';
select is(
  (select row_count from (select count(*) as row_count from public.deviations where id = 'd0000000-0000-0000-0000-000000000002') s),
  0::bigint,
  'User B cannot UPDATE User A deviations'
);

-- User B cannot delete User A's deviations
delete from public.deviations where id = 'd0000000-0000-0000-0000-000000000002';
select is(
  (select count(*) from public.deviations where id = 'd0000000-0000-0000-0000-000000000002'),
  0::bigint,
  'User B cannot DELETE User A deviations'
);

-- 4. updated_at changes on update
set local role authenticated;
set local "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local "request.jwt.claim.role" = 'authenticated';

-- Simulate past created_at and updated_at
update public.deviations
set updated_at = now() - interval '1 hour'
where id = 'd0000000-0000-0000-0000-000000000001';

update public.deviations
set value = 20
where id = 'd0000000-0000-0000-0000-000000000001';

select ok(
  (select updated_at > now() - interval '10 seconds' from public.deviations where id = 'd0000000-0000-0000-0000-000000000001'),
  'Trigger tr_deviations_updated_at updates updated_at timestamp on row update'
);

-- 5. Cascade delete when auth user is deleted
set local role postgres;
delete from auth.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select is(
  (select count(*) from public.deviations where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint,
  'Deviations are cascade deleted when user is deleted from auth.users'
);

rollback;
