-- Migration: 20260920000007_create_goals_phase6.sql
-- Description: Creates the goals table with partial unique index, reference_profile snapshot, and RLS policies for Phase 6.

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource text not null check (resource in ('water', 'energy')),
  period text not null check (period in ('week', 'month')),
  target_amount numeric(10, 2) not null check (target_amount > 0 and target_amount <= 1000000),
  start_date date not null,
  -- reference_profile stores an immutable JSON snapshot of the user's typical baseline habits at goal creation time.
  -- Reason: Baselines can be modified or updated on the same day, and goal progress must remain measured
  -- against the exact profile habits the user had when they committed to the goal.
  reference_profile jsonb not null check (jsonb_typeof(reference_profile) = 'object'),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Comments on table and columns
comment on table public.goals is 'User goals for resource reduction with snapshot reference baselines.';
comment on column public.goals.reference_profile is 'Snapshot of BaselineProfile when goal was established to preserve baseline comparison integrity.';

-- Partial unique index: At most one active goal per resource and period per user
create unique index idx_goals_user_resource_period_active 
  on public.goals (user_id, resource, period) 
  where status = 'active';

-- Index for listing goals by user and status
create index idx_goals_user_status 
  on public.goals (user_id, status);

-- Index on start_date for range queries
create index idx_goals_user_start_date 
  on public.goals (user_id, start_date);

-- Reuse existing shared trigger for updated_at
create trigger set_goals_updated_at
  before update on public.goals
  for each row
  execute function public.set_updated_at();

-- Enable Row Level Security
alter table public.goals enable row level security;

-- Revoke all unneeded privileges from anon and public
revoke all on public.goals from public;
revoke all on public.goals from anon;
grant select, insert, update, delete on public.goals to authenticated;

-- RLS Policies: Granular, single-operation policies with (select auth.uid())

-- 1. SELECT Policy
create policy "Users can view their own goals"
  on public.goals
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- 2. INSERT Policy
create policy "Users can insert their own goals"
  on public.goals
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- 3. UPDATE Policy
create policy "Users can update their own goals"
  on public.goals
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 4. DELETE Policy
create policy "Users can delete their own goals"
  on public.goals
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
