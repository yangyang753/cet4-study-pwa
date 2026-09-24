do $$
declare
  table_name text;
  constraint_name text;
begin
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
