create table if not exists public.daily_plans (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.daily_plans enable row level security;
drop policy if exists daily_plans_owner on public.daily_plans;
create policy daily_plans_owner on public.daily_plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists daily_plans_owner_updated on public.daily_plans(user_id, updated_at, id);
