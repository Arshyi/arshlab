create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  label text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

drop policy if exists "Users can select their own achievement unlocks" on public.user_achievements;
drop policy if exists "Users can insert their own achievement unlocks" on public.user_achievements;

create policy "Users can select their own achievement unlocks"
  on public.user_achievements
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own achievement unlocks"
  on public.user_achievements
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create index if not exists user_achievements_user_unlocked_idx
  on public.user_achievements (user_id, unlocked_at desc);
