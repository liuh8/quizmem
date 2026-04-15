create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  target_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id integer not null,
  question_type text not null,
  user_answer text,
  is_correct boolean not null,
  answered_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wrong_books (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id integer not null,
  wrong_count integer not null default 1,
  added_at timestamptz not null default timezone('utc', now()),
  last_wrong_at timestamptz not null default timezone('utc', now()),
  is_resolved boolean not null default false,
  primary key (user_id, question_id)
);

create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  new_question_ids jsonb not null default '[]'::jsonb,
  review_question_ids jsonb not null default '[]'::jsonb,
  completed_new_question_ids jsonb not null default '[]'::jsonb,
  completed_review_question_ids jsonb not null default '[]'::jsonb,
  is_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, date)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_daily_plans_updated_at on public.daily_plans;
create trigger set_daily_plans_updated_at
before update on public.daily_plans
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_logs enable row level security;
alter table public.wrong_books enable row level security;
alter table public.daily_plans enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id);

drop policy if exists "user_logs_all_own" on public.user_logs;
create policy "user_logs_all_own"
on public.user_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "wrong_books_all_own" on public.wrong_books;
create policy "wrong_books_all_own"
on public.wrong_books for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "daily_plans_all_own" on public.daily_plans;
create policy "daily_plans_all_own"
on public.daily_plans for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
