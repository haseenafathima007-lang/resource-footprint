-- Migration 3: Create baseline_profiles table with append-only history
-- DB constraints and engine bounds (PROFILE_BOUNDS in src/engine/engine.ts) must change together.
-- Updating a baseline inserts a new row (or upserts if one already exists for today).
-- Current baseline for a user is: latest effective_from <= current_date.

create table if not exists public.baseline_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_from date not null default current_date,

  -- Household size (integer 1-20)
  household_size int not null check (household_size >= 1 and household_size <= 20),

  -- Shower habits
  shower_minutes_per_day numeric(5,2) not null check (shower_minutes_per_day >= 0 and shower_minutes_per_day <= 120),
  shower_heater text not null check (shower_heater in ('none', 'electric')),

  -- Cooling and appliance habits (hours/day 0-24)
  ac_hours_per_day numeric(4,2) not null check (ac_hours_per_day >= 0 and ac_hours_per_day <= 24),
  fan_hours_per_day numeric(4,2) not null check (fan_hours_per_day >= 0 and fan_hours_per_day <= 24),
  laptop_hours_per_day numeric(4,2) not null check (laptop_hours_per_day >= 0 and laptop_hours_per_day <= 24),

  -- Laundry habits (loads/week 0-50)
  laundry_loads_per_week numeric(5,2) not null check (laundry_loads_per_week >= 0 and laundry_loads_per_week <= 50),
  laundry_machine text not null check (laundry_machine in ('topLoad', 'frontLoad')),

  -- Factors version reference
  factors_version text not null references public.factor_sets(version),

  created_at timestamptz not null default now(),

  -- One baseline per user per date (enforces append-only daily history)
  constraint uq_baseline_profiles_user_effective unique (user_id, effective_from)
);

-- Index for retrieving current and historical baselines quickly
create index if not exists idx_baseline_profiles_user_effective
  on public.baseline_profiles (user_id, effective_from desc);

comment on table public.baseline_profiles is 'Append-only baseline history. DB constraints mirror PROFILE_BOUNDS in src/engine/engine.ts; both must change together.';
