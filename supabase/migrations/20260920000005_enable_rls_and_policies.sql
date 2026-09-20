-- Migration 5: Enable Row-Level Security (RLS) and configure granular policies
-- Every table in the public schema has RLS enabled.
-- Anonymous users get zero access to user-owned tables.
-- Authenticated users access only their own rows via (select auth.uid()).
-- factor_sets is public read-only (anon and authenticated); immutable with no write policies.

-- 1. Enable RLS on all public tables
alter table public.profiles enable row level security;
alter table public.factor_sets enable row level security;
alter table public.baseline_profiles enable row level security;
alter table public.deviations enable row level security;

-- 2. Revoke default privileges from anon on user-owned tables
revoke all on table public.profiles from anon;
revoke all on table public.baseline_profiles from anon;
revoke all on table public.deviations from anon;

-- Grant select on factor_sets to anon and authenticated
grant select on table public.factor_sets to anon, authenticated;

-- Grant standard DML on user tables to authenticated
grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.baseline_profiles to authenticated;
grant select, insert, update, delete on table public.deviations to authenticated;

--------------------------------------------------------------------------------
-- PROFILES POLICIES
--------------------------------------------------------------------------------
-- SELECT: Authenticated users can view only their own profile
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

-- UPDATE: Authenticated users can update only their own profile
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Note: No INSERT or DELETE policies on profiles for clients; profiles are created
-- exclusively via the auth.users trigger and deleted via cascade.

--------------------------------------------------------------------------------
-- FACTOR_SETS POLICIES
--------------------------------------------------------------------------------
-- SELECT: Anon users can read factor sets (required by What-If Simulator before signup)
create policy "factor_sets_select_anon"
  on public.factor_sets
  for select
  to anon
  using (true);

-- SELECT: Authenticated users can read factor sets
create policy "factor_sets_select_authenticated"
  on public.factor_sets
  for select
  to authenticated
  using (true);

-- Note: No INSERT, UPDATE, or DELETE policies exist for any role.
-- Published factor sets are completely immutable.

--------------------------------------------------------------------------------
-- BASELINE_PROFILES POLICIES
--------------------------------------------------------------------------------
-- SELECT: Authenticated users can read their own baselines
create policy "baseline_profiles_select_own"
  on public.baseline_profiles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- INSERT: Authenticated users can insert baselines only for themselves
create policy "baseline_profiles_insert_own"
  on public.baseline_profiles
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- UPDATE: Authenticated users can update only their own baselines
create policy "baseline_profiles_update_own"
  on public.baseline_profiles
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- DELETE: Authenticated users can delete only their own baselines
create policy "baseline_profiles_delete_own"
  on public.baseline_profiles
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

--------------------------------------------------------------------------------
-- DEVIATIONS POLICIES
--------------------------------------------------------------------------------
-- SELECT: Authenticated users can read their own deviations
create policy "deviations_select_own"
  on public.deviations
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- INSERT: Authenticated users can insert deviations only for themselves
create policy "deviations_insert_own"
  on public.deviations
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- UPDATE: Authenticated users can update only their own deviations
create policy "deviations_update_own"
  on public.deviations
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- DELETE: Authenticated users can delete only their own deviations
create policy "deviations_delete_own"
  on public.deviations
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
