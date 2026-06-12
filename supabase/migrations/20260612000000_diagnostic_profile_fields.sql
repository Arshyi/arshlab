alter table public.user_profiles
  add column if not exists completed_diagnostics integer not null default 0 check (completed_diagnostics >= 0),
  add column if not exists last_diagnostic_at timestamptz,
  add column if not exists last_diagnostic_accuracy integer not null default 0 check (last_diagnostic_accuracy >= 0 and last_diagnostic_accuracy <= 100),
  add column if not exists previous_diagnostic_accuracy integer check (previous_diagnostic_accuracy >= 0 and previous_diagnostic_accuracy <= 100),
  add column if not exists best_diagnostic_accuracy integer not null default 0 check (best_diagnostic_accuracy >= 0 and best_diagnostic_accuracy <= 100);

create index if not exists user_profiles_last_diagnostic_at_idx
  on public.user_profiles (last_diagnostic_at desc);
