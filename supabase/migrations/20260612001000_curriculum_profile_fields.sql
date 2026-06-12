alter table public.user_profiles
  add column if not exists selected_curriculum text not null default 'general-first-year',
  add column if not exists curriculum_started_at timestamptz,
  add column if not exists curriculum_updated_at timestamptz;

create index if not exists user_profiles_selected_curriculum_idx
  on public.user_profiles (selected_curriculum);
