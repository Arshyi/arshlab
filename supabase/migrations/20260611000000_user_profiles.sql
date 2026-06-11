create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  daily_goal integer not null default 10 check (daily_goal in (5, 10, 20)),
  completed_sessions integer not null default 0 check (completed_sessions >= 0),
  completed_exams integer not null default 0 check (completed_exams >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can select their own profile" on public.user_profiles;
drop policy if exists "Users can insert their own profile" on public.user_profiles;
drop policy if exists "Users can update their own profile" on public.user_profiles;

create policy "Users can select their own profile"
  on public.user_profiles
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on public.user_profiles
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.user_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_profiles_updated_at_idx
  on public.user_profiles (updated_at desc);
