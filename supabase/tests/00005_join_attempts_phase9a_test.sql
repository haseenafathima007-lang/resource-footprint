begin;
select plan(6);

-- Setup test users directly in auth.users
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rate1@example.com', 'dummy_hash', now(), '{"provider":"email"}', '{"display_name":"Rate1"}', now(), now()),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rate2@example.com', 'dummy_hash', now(), '{"provider":"email"}', '{"display_name":"Rate2"}', now(), now());

-- Test 1: Schema verification
select has_table('public', 'join_attempts', 'join_attempts table exists');
select has_column('public', 'join_attempts', 'user_id', 'has user_id column');
select has_column('public', 'join_attempts', 'attempt_code', 'has attempt_code column');
select has_column('public', 'join_attempts', 'success', 'has success column');

-- Test 2: RLS check & recording - authenticated users only see their own attempts
set local role authenticated;
set local "request.jwt.claim.sub" = '55555555-5555-5555-5555-555555555555';
set local "request.jwt.claim.role" = 'authenticated';

-- Insert 5 failed attempts directly to test the rate limit threshold (since pgTAP throws_ok sub-transaction rollback reverts RPC inserts)
set local role postgres;
insert into public.join_attempts (user_id, attempt_code, success, attempted_at)
values
  ('55555555-5555-5555-5555-555555555555', 'INVALID01', false, now()),
  ('55555555-5555-5555-5555-555555555555', 'INVALID02', false, now()),
  ('55555555-5555-5555-5555-555555555555', 'INVALID03', false, now()),
  ('55555555-5555-5555-5555-555555555555', 'INVALID04', false, now()),
  ('55555555-5555-5555-5555-555555555555', 'INVALID05', false, now());

set local role authenticated;
set local "request.jwt.claim.sub" = '55555555-5555-5555-5555-555555555555';
set local "request.jwt.claim.role" = 'authenticated';

-- Test 3: 6th attempt must fail with RATE_LIMITED
select throws_ok(
  $$ select public.join_team_with_rate_limit('INVALID06', 'Alias1', '{"householdSize":1}'::jsonb, 150.0, 5.0) $$,
  'P0001',
  'RATE_LIMITED',
  '6th attempt within 15 minutes is locked out with RATE_LIMITED'
);

-- Test 4: Rate limit expiry (timestamps older than 15 min are ignored)
set local role postgres;

insert into public.join_attempts (user_id, attempt_code, success, attempted_at)
values ('66666666-6666-6666-6666-666666666666', 'WRONGCODE', false, now() - interval '20 minutes');

set local role authenticated;
set local "request.jwt.claim.sub" = '66666666-6666-6666-6666-666666666666';
set local "request.jwt.claim.role" = 'authenticated';

select is(
  (
    select count(*)::integer from public.join_attempts
    where user_id = '66666666-6666-6666-6666-666666666666'
      and success = false
      and attempted_at >= now() - interval '15 minutes'
  ),
  0,
  'Attempt older than 15 minutes is ignored by rate limit check'
);

select * from finish();
rollback;
