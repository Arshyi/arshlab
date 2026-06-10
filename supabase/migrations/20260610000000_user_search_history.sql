create extension if not exists pgcrypto;

create table if not exists public.user_search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('molecule', 'reaction')),
  query text not null,
  result_title text,
  result_summary text,
  formula text,
  family text,
  reaction_type text,
  predicted_products text[],
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.user_search_history enable row level security;

drop policy if exists "Users can select their own search history" on public.user_search_history;
drop policy if exists "Users can insert their own search history" on public.user_search_history;
drop policy if exists "Users can delete their own search history" on public.user_search_history;
drop policy if exists "Users can update their own search history" on public.user_search_history;

create policy "Users can select their own search history"
  on public.user_search_history
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own search history"
  on public.user_search_history
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own search history"
  on public.user_search_history
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update their own search history"
  on public.user_search_history
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_search_history_user_id_idx
  on public.user_search_history (user_id);

create index if not exists user_search_history_user_created_at_idx
  on public.user_search_history (user_id, created_at desc);

create index if not exists user_search_history_user_type_created_at_idx
  on public.user_search_history (user_id, type, created_at desc);
