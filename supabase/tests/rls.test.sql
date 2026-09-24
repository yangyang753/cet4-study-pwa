begin;
select plan(20);
select ok((select relrowsecurity from pg_class where oid = 'public.attempts'::regclass), 'attempts has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.drafts'::regclass), 'drafts has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.review_queue'::regclass), 'review queue has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.task_completions'::regclass), 'task completions has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.knowledge_states'::regclass), 'knowledge states has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.exam_sessions'::regclass), 'exam sessions has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.user_settings'::regclass), 'settings has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.tombstones'::regclass), 'tombstones has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.daily_plans'::regclass), 'daily plans has RLS');
select is((select count(*) from pg_policies where schemaname = 'public' and policyname like '%_owner'), 11::bigint, 'all owned tables have owner policies');
select is((select column_default from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'target_exam_date'), '''2026-12-12''::date', 'exam date default is correct');
select is((select data_type from information_schema.columns where table_schema = 'public' and table_name = 'daily_plans' and column_name = 'id'), 'text', 'daily plan id is text');
select is((select data_type from information_schema.columns where table_schema = 'public' and table_name = 'daily_plans' and column_name = 'payload'), 'jsonb', 'daily plan payload is jsonb');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'daily_plans' and policyname = 'daily_plans_owner'), 'daily plans owner policy exists');
select ok((
  select array_agg(attribute.attname order by key.ordinality) = array['user_id', 'id']::name[]
  from pg_constraint constraint_record
  cross join lateral unnest(constraint_record.conkey) with ordinality as key(attnum, ordinality)
  join pg_attribute attribute on attribute.attrelid = constraint_record.conrelid and attribute.attnum = key.attnum
  where constraint_record.conrelid = format('public.%I', owned.table_name)::regclass and constraint_record.contype = 'p'
), format('%s primary key is owner scoped', owned.table_name))
from unnest(array['daily_plans', 'review_queue', 'task_completions', 'knowledge_states', 'exam_sessions', 'tombstones']) as owned(table_name);
select * from finish();
rollback;
