alter table public.practice_progress
  add column if not exists question_source text not null default 'ai'
  check (question_source in ('ai', 'database'));

create index if not exists practice_progress_user_source_timestamp_idx
  on public.practice_progress (user_id, question_source, timestamp desc);
