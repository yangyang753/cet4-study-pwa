import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const defaultRoot = process.cwd();
const requiredOwnerTables = ['review_queue', 'task_completions', 'knowledge_states', 'exam_sessions', 'tombstones'];

export function verifyMigrationContracts(root = defaultRoot): string[] {
  const errors: string[] = [];
  const read = (relativePath: string) => {
    const filename = path.join(root, relativePath);
    if (!existsSync(filename)) { errors.push(`Missing ${relativePath}`); return ''; }
    return readFileSync(filename, 'utf8').toLowerCase();
  };
  for (const name of ['001_initial.sql', '002_complete_learning_sync.sql', '003_mistake_reasons.sql']) read(`supabase/migrations/${name}`);
  const dailyPlans = read('supabase/migrations/004_daily_plans.sql');
  const ownerKeys = read('supabase/migrations/005_owner_scoped_keys.sql');
  const rls = read('supabase/tests/rls.test.sql');

  if (dailyPlans.includes('create table if not exists public.daily_plans')) errors.push('004 must upgrade the existing daily_plans table');
  for (const contract of ['alter table public.daily_plans', 'payload jsonb', "id = 'plan:' || plan_date::text", 'primary key (user_id, id)', 'drop column tasks']) {
    if (!dailyPlans.includes(contract)) errors.push(`004 missing contract: ${contract}`);
  }
  for (const table of requiredOwnerTables) if (!ownerKeys.includes(`'${table}'`)) errors.push(`005 missing owner table ${table}`);
  if (!ownerKeys.includes('add primary key (user_id, id)')) errors.push('005 must add owner-scoped primary keys');
  for (const contract of ["column_name = 'tasks'", "id = 'plan:' || plan_date::text", 'drop column tasks']) {
    if (!ownerKeys.includes(contract)) errors.push(`005 missing legacy daily-plan recovery: ${contract}`);
  }
  if (/array\[[^\]]*'(attempts|drafts)'/s.test(ownerKeys)) errors.push('005 must not rewrite attempts or drafts primary keys');
  for (const table of ['daily_plans', ...requiredOwnerTables]) if (!rls.includes(`'${table}'`)) errors.push(`RLS tests missing ${table} owner-key assertion`);
  if (!rls.includes('select plan(20)')) errors.push('RLS pgTAP plan must match 20 assertions');
  if (!rls.includes("column_name = 'payload'")) errors.push('RLS tests must assert the daily plan payload type');
  return errors;
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  const errors = verifyMigrationContracts();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log('Supabase migration contracts verified: 001–005 and owner-scoped keys.');
}
