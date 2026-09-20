-- Migration 4: Create deviations table
-- Deviations store dated exceptions to baseline habits (e.g. heatwave, travel, guests).
-- This schema is provisional and will be expanded with full UI in Phase 5.

create table if not exists public.deviations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  field text not null check (
    field in (
      'shower_minutes_per_day',
      'ac_hours_per_day',
      'fan_hours_per_day',
      'laptop_hours_per_day',
      'laundry_loads_per_week'
    )
  ),
  mode text not null check (mode in ('delta', 'override')),
  value numeric not null,
  note text check (note is null or length(trim(note)) <= 200),
  created_at timestamptz not null default now(),

  constraint chk_deviations_date_order check (end_date >= start_date)
);

-- Index for querying deviations by user and date
create index if not exists idx_deviations_user_start_date
  on public.deviations (user_id, start_date);

comment on table public.deviations is 'Dated deviations adjusting baseline habits for specific periods. Provisional schema for Phase 5.';
