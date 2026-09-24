alter table public.daily_plans
  add column if not exists payload jsonb;

alter table public.daily_plans
  drop constraint if exists daily_plans_pkey;

alter table public.daily_plans
  alter column id type text using id::text;

update public.daily_plans
set id = 'plan:' || plan_date::text,
    payload = jsonb_build_object(
      'id', 'plan:' || plan_date::text,
      'date', plan_date,
      'tasks', tasks,
      'updatedAt', updated_at
    );

alter table public.daily_plans
  alter column payload set not null,
  add primary key (user_id, id),
  drop column tasks;

alter table public.daily_plans enable row level security;
drop policy if exists daily_plans_owner on public.daily_plans;
create policy daily_plans_owner on public.daily_plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists daily_plans_owner_updated on public.daily_plans(user_id, updated_at, id);
