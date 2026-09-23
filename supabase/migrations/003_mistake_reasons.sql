alter table public.attempts
  add column if not exists mistake_reason text;

alter table public.review_queue
  add column if not exists reason text;
