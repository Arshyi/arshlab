alter table public.practice_progress
  add column if not exists subtopic text not null default 'General',
  add column if not exists question_type text not null default 'Practice';

create index if not exists practice_progress_user_subtopic_timestamp_idx
  on public.practice_progress (user_id, subtopic, timestamp desc);

create table if not exists public.concept_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  subtopic text not null,
  attempted integer not null default 0 check (attempted >= 0),
  correct integer not null default 0 check (correct >= 0),
  mastery integer not null default 0 check (mastery >= 0 and mastery <= 100),
  updated_at timestamptz not null default now(),
  unique (user_id, topic, subtopic)
);

alter table public.concept_progress enable row level security;

drop policy if exists "Users can select their own concept progress" on public.concept_progress;
drop policy if exists "Users can insert their own concept progress" on public.concept_progress;
drop policy if exists "Users can update their own concept progress" on public.concept_progress;
drop policy if exists "Users can delete their own concept progress" on public.concept_progress;

create policy "Users can select their own concept progress"
  on public.concept_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own concept progress"
  on public.concept_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own concept progress"
  on public.concept_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own concept progress"
  on public.concept_progress
  for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists concept_progress_user_mastery_idx
  on public.concept_progress (user_id, mastery asc, attempted desc);

create index if not exists concept_progress_user_updated_idx
  on public.concept_progress (user_id, updated_at desc);
