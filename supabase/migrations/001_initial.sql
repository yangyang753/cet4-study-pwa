create extension if not exists pgcrypto;

create table public.profiles (user_id uuid primary key references auth.users(id) on delete cascade, target_exam_date date not null default '2026-12-31', daily_minutes integer not null default 60 check (daily_minutes between 15 and 240), updated_at timestamptz not null default now());
create table public.knowledge_points (id text primary key, title text not null, category text not null, content_version text not null);
create table public.questions (id text primary key, kind text not null, payload jsonb not null, content_version text not null);
create table public.question_options (id text primary key, question_id text not null references public.questions(id) on delete cascade, label text not null, body text not null);
create table public.audio_assets (id text primary key, object_path text not null, duration_seconds numeric not null, segments jsonb not null, content_version text not null);
create table public.practice_sets (id text primary key, title text not null, question_ids text[] not null, content_version text not null);
create table public.attempts (id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, question_id text not null, response jsonb not null, correct boolean, score numeric, duration_seconds integer not null default 0, created_at timestamptz not null default now());
create table public.mistake_tags (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, attempt_id uuid not null references public.attempts(id) on delete cascade, reason text not null, created_at timestamptz not null default now());
create table public.review_queue (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, question_id text not null, priority numeric not null default 1, next_review_at timestamptz not null, updated_at timestamptz not null default now(), unique(user_id, question_id));
create table public.daily_plans (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, plan_date date not null, tasks jsonb not null, updated_at timestamptz not null default now(), unique(user_id, plan_date));
create table public.drafts (id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, question_id text not null, body text not null, device_id text not null, updated_at timestamptz not null default now());

alter table public.profiles enable row level security;
alter table public.attempts enable row level security;
alter table public.mistake_tags enable row level security;
alter table public.review_queue enable row level security;
alter table public.daily_plans enable row level security;
alter table public.drafts enable row level security;
alter table public.knowledge_points enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.audio_assets enable row level security;
alter table public.practice_sets enable row level security;

create policy profiles_owner on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy attempts_owner on public.attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy mistake_tags_owner on public.mistake_tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy review_queue_owner on public.review_queue for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy daily_plans_owner on public.daily_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy drafts_owner on public.drafts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy knowledge_read on public.knowledge_points for select to authenticated using (true);
create policy questions_read on public.questions for select to authenticated using (true);
create policy options_read on public.question_options for select to authenticated using (true);
create policy audio_read on public.audio_assets for select to authenticated using (true);
create policy sets_read on public.practice_sets for select to authenticated using (true);
