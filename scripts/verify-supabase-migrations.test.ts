import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { verifyMigrationContracts } from './verify-supabase-migrations.mts';

const read = (relativePath: string) => readFileSync(path.join(process.cwd(), relativePath), 'utf8').toLowerCase();

describe('Supabase migration contracts', () => {
  it('migrates daily plans instead of relying on create-table-if-missing', () => {
    const migration004 = read('supabase/migrations/004_daily_plans.sql');
    expect(migration004).toContain('alter table public.daily_plans');
    expect(migration004).toContain('payload jsonb');
    expect(migration004).not.toContain('create table if not exists public.daily_plans');
  });

  it('owner-scopes every deterministic text id', () => {
    const migrations = ['supabase/migrations/004_daily_plans.sql', 'supabase/migrations/005_owner_scoped_keys.sql'].map(read).join('\n');
    for (const table of ['daily_plans', 'review_queue', 'task_completions', 'knowledge_states', 'exam_sessions', 'tombstones']) {
      expect(migrations).toContain(table);
    }
    expect(migrations.match(/primary key \(user_id, id\)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('repairs projects that already recorded the legacy migration 004', () => {
    const migration005 = read('supabase/migrations/005_owner_scoped_keys.sql');
    expect(migration005).toContain("column_name = 'tasks'");
    expect(migration005).toContain("id = 'plan:' || plan_date::text");
    expect(migration005).toContain('drop column tasks');
  });

  it('passes the complete static migration contract audit', () => {
    expect(verifyMigrationContracts()).toEqual([]);
  });
});
