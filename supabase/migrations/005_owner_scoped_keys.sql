alter table public.daily_plans
  add column if not exists payload jsonb;

do $$
declare
  table_name text;
  constraint_name text;
begin
  if exists (
    select 1 from information_schema.columns as columns
    where columns.table_schema = 'public' and columns.table_name = 'daily_plans' and columns.column_name = 'tasks'
  ) then
    execute $migration$alter table public.daily_plans drop constraint if exists daily_plans_pkey$migration$;
    execute $migration$alter table public.daily_plans alter column id type text using id::text$migration$;
    execute $migration$
      update public.daily_plans
      set id = 'plan:' || plan_date::text,
          payload = jsonb_build_object(
            'id', 'plan:' || plan_date::text,
            'date', plan_date,
            'tasks', tasks,
            'updatedAt', updated_at
          )
    $migration$;
    execute $migration$
      alter table public.daily_plans
        alter column payload set not null,
        add primary key (user_id, id),
        drop column tasks
    $migration$;
  end if;

  foreach table_name in array array[
    'review_queue',
    'task_completions',
    'knowledge_states',
    'exam_sessions',
    'tombstones'
  ] loop
    select con.conname into constraint_name
    from pg_constraint con
    where con.conrelid = format('public.%I', table_name)::regclass
      and con.contype = 'p';

    if constraint_name is not null then
      execute format('alter table public.%I drop constraint %I', table_name, constraint_name);
    end if;
    execute format('alter table public.%I add primary key (user_id, id)', table_name);
  end loop;
end $$;
