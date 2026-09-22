begin;
select plan(2);
select ok((select relrowsecurity from pg_class where oid = 'public.attempts'::regclass), 'attempts has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.drafts'::regclass), 'drafts has RLS');
select * from finish();
rollback;
