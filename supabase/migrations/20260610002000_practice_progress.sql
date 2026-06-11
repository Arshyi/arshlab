create extension if not exists pgcrypto;

create table if not exists public.practice_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  difficulty text not null,
  correct boolean not null,
  timestamp timestamptz not null default now()
);

alter table public.practice_progress enable row level security;

drop policy if exists "Users can select their own practice progress" on public.practice_progress;
drop policy if exists "Users can insert their own practice progress" on public.practice_progress;
drop policy if exists "Users can delete their own practice progress" on public.practice_progress;

create policy "Users can select their own practice progress"
  on public.practice_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own practice progress"
  on public.practice_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own practice progress"
  on public.practice_progress
  for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists practice_progress_user_timestamp_idx
  on public.practice_progress (user_id, timestamp desc);

create index if not exists practice_progress_user_topic_timestamp_idx
  on public.practice_progress (user_id, topic, timestamp desc);
