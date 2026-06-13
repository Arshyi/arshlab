alter table public.practice_progress
  add column if not exists exam_source text
  check (exam_source in ('ai', 'database', 'hybrid', 'adaptive'));

create index if not exists practice_progress_user_exam_source_timestamp_idx
  on public.practice_progress (user_id, exam_source, timestamp desc);
