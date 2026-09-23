alter table public.profiles alter column target_exam_date set default '2026-12-12';

alter table public.attempts add column if not exists content_version text not null default 'v1';
alter table public.attempts add column if not exists kind text not null default 'practice';
alter table public.attempts add column if not exists mode text not null default 'practice';
alter table public.attempts add column if not exists device_id text not null default 'unknown';
alter table public.attempts add column if not exists updated_at timestamptz not null default now();
alter table public.review_queue add column if not exists stage integer not null default 0;
alter table public.review_queue add column if not exists last_correct boolean;

create table if not exists public.task_completions (
  id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null, kind text not null, completion_date date not null,
  completed_at timestamptz not null, updated_at timestamptz not null default now()
);
create table if not exists public.knowledge_states (
  id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null, status text not null, favorite boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.exam_sessions (
  id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  mock_id text not null, content_version text not null, status text not null,
  payload jsonb not null, updated_at timestamptz not null default now()
);
create table if not exists public.user_settings (
  id text not null, user_id uuid not null references auth.users(id) on delete cascade,
  exam_date date not null default '2026-12-12', daily_minutes integer not null default 60,
  payload jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create table if not exists public.tombstones (
  id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  entity_kind text not null, entity_id text not null, deleted_at timestamptz not null,
  updated_at timestamptz not null default now(), unique (user_id, entity_kind, entity_id)
);

alter table public.attempts enable row level security;
alter table public.drafts enable row level security;
alter table public.review_queue enable row level security;
alter table public.task_completions enable row level security;
alter table public.knowledge_states enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.user_settings enable row level security;
alter table public.tombstones enable row level security;

drop policy if exists attempts_owner on public.attempts;
drop policy if exists drafts_owner on public.drafts;
drop policy if exists review_queue_owner on public.review_queue;
create policy attempts_owner on public.attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy drafts_owner on public.drafts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy review_queue_owner on public.review_queue for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy task_completions_owner on public.task_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy knowledge_states_owner on public.knowledge_states for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy exam_sessions_owner on public.exam_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_settings_owner on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy tombstones_owner on public.tombstones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists attempts_owner_updated on public.attempts(user_id, updated_at, id);
create index if not exists drafts_owner_updated on public.drafts(user_id, updated_at, id);
create index if not exists review_owner_updated on public.review_queue(user_id, updated_at, id);
create index if not exists completions_owner_updated on public.task_completions(user_id, updated_at, id);
create index if not exists knowledge_owner_updated on public.knowledge_states(user_id, updated_at, id);
create index if not exists exams_owner_updated on public.exam_sessions(user_id, updated_at, id);
create index if not exists tombstones_owner_updated on public.tombstones(user_id, updated_at, id);
