import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('complete learning sync migration', () => {
  it('creates every owned table with RLS and owner policies', async () => {
    const sql = await readFile(path.join(process.cwd(), 'supabase/migrations/002_complete_learning_sync.sql'), 'utf8');
    const tables = ['attempts', 'drafts', 'review_queue', 'task_completions', 'knowledge_states', 'exam_sessions', 'user_settings', 'tombstones'];
    for (const table of tables) {
      expect(sql).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
      expect(sql).toMatch(new RegExp(`create policy ${table}_owner`, 'i'));
    }
    expect(sql).toContain("default '2026-12-12'");
    expect(sql).toMatch(/review_queue alter column id type text/i);
  });
});
