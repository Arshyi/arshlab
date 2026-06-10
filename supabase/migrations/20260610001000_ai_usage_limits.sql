create extension if not exists pgcrypto;

create table if not exists public.ai_usage_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid nullable references auth.users(id) on delete cascade,
  anon_id text nullable,
  date text not null,
  request_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ai_usage_limits enable row level security;

drop policy if exists "Users can select their own AI usage" on public.ai_usage_limits;
drop policy if exists "Users can insert their own AI usage" on public.ai_usage_limits;
drop policy if exists "Users can update their own AI usage" on public.ai_usage_limits;

create policy "Users can select their own AI usage"
  on public.ai_usage_limits
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own AI usage"
  on public.ai_usage_limits
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own AI usage"
  on public.ai_usage_limits
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create unique index if not exists ai_usage_limits_user_date_idx
  on public.ai_usage_limits (user_id, date)
  where user_id is not null;

create index if not exists ai_usage_limits_anon_date_idx
  on public.ai_usage_limits (anon_id, date)
  where anon_id is not null;
