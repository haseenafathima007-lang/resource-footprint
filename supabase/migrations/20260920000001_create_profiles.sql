-- Migration 1: Create profiles table and auth user trigger
-- Handles updated_at maintenance and automatic profile row creation on auth.users insert

-- Shared trigger function for updated_at timestamps
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or length(trim(display_name)) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Maintain updated_at on profiles
create trigger tr_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Trigger function to automatically insert a profile row when a new user registers
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(trim(new.raw_user_meta_data->>'display_name'), ''));
  return new;
end;
$$;

-- Fire trigger after user is created in auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
