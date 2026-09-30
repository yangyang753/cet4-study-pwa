-- Preserve all optional learning fields during multi-device synchronization.
alter table public.review_queue
  add column if not exists payload jsonb not null default '{}'::jsonb;

alter table public.knowledge_states
  add column if not exists payload jsonb not null default '{}'::jsonb;

