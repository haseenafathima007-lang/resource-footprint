-- Migration 2: Create factor_sets table for versioned conversion factors
-- factor_sets stores versioned conversion factor sets.
-- src/data/factors.v1.json is the single source of truth.
-- Published versions are immutable: new versions arrive only via new migrations/seeds.

create table if not exists public.factor_sets (
  version text primary key,
  region text not null,
  effective_from date not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.factor_sets is 'Versioned conversion factors; single source of truth is src/data/factors.v1.json. Published rows are immutable.';
