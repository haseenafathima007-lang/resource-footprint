-- Migration 6: Alter deviations table for Phase 5
-- Adds group_id, updated_at, field-specific CHECK constraints mirroring PROFILE_BOUNDS,
-- and 365-day range check.

-- 1. Add group_id for grouping atomic preset rows
alter table public.deviations
  add column if not exists group_id uuid null;

create index if not exists idx_deviations_user_group
  on public.deviations (user_id, group_id);

-- 2. Add updated_at with automatic trigger
alter table public.deviations
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists tr_deviations_updated_at on public.deviations;
create trigger tr_deviations_updated_at
  before update on public.deviations
  for each row execute function public.set_updated_at();

-- 3. Field-specific bounds constraints mirroring PROFILE_BOUNDS
-- Note: DB and engine bounds must change together. Mirroring PROFILE_BOUNDS in src/engine/profile.ts:
-- showerMinutesPerDay: [0, 120]
-- acHoursPerDay: [0, 24]
-- fanHoursPerDay: [0, 24]
-- laptopHoursPerDay: [0, 24]
-- laundryLoadsPerWeek: [0, 50]
-- mode 'override': 0 <= value <= max
-- mode 'delta': value <> 0 and abs(value) <= max

alter table public.deviations
  add constraint chk_deviations_field_value check (
    case field
      when 'shower_minutes_per_day' then
        case mode
          when 'override' then value >= 0 and value <= 120
          when 'delta' then value <> 0 and abs(value) <= 120
        end
      when 'ac_hours_per_day' then
        case mode
          when 'override' then value >= 0 and value <= 24
          when 'delta' then value <> 0 and abs(value) <= 24
        end
      when 'fan_hours_per_day' then
        case mode
          when 'override' then value >= 0 and value <= 24
          when 'delta' then value <> 0 and abs(value) <= 24
        end
      when 'laptop_hours_per_day' then
        case mode
          when 'override' then value >= 0 and value <= 24
          when 'delta' then value <> 0 and abs(value) <= 24
        end
      when 'laundry_loads_per_week' then
        case mode
          when 'override' then value >= 0 and value <= 50
          when 'delta' then value <> 0 and abs(value) <= 50
        end
    end
  );

-- 4. Date range constraint: end_date - start_date <= 365
alter table public.deviations
  add constraint chk_deviations_max_range check (end_date - start_date <= 365);

-- 5. Helper function and RLS policies for cross-user group_id isolation
-- Security definer prevents infinite recursion in RLS
create or replace function public.is_group_accessible_to_user(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.deviations
    where group_id = p_group_id and user_id <> p_user_id
  );
$$;

drop policy if exists "deviations_insert_own" on public.deviations;
create policy "deviations_insert_own"
  on public.deviations
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      group_id is null
      or public.is_group_accessible_to_user(group_id, (select auth.uid()))
    )
  );

drop policy if exists "deviations_update_own" on public.deviations;
create policy "deviations_update_own"
  on public.deviations
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      group_id is null
      or public.is_group_accessible_to_user(group_id, (select auth.uid()))
    )
  );
