# CET-4 Sync, Backup, and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make learning data safely portable between phone and computer, observable when offline, and deployable with verified GitHub Pages configuration.

**Architecture:** Dexie remains the source of immediate local truth. A bidirectional Supabase adapter pulls owned rows, merges by entity rules, pushes an idempotent queue, and exposes status; JSON export/import provides a credential-independent recovery path.

**Tech Stack:** Supabase Auth/Postgres/RLS, Dexie 4, React 19, TypeScript 6, Vitest, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-23-cet4-learning-loop-design.md`

## Global Constraints

- The app must remain fully usable without Supabase configuration or internet access.
- A network error must never remove local data or block answering.
- Each authenticated user may read and write only their own learning rows.
- Attempts are append-only and deduplicated by ID; newer `updatedAt` wins for mutable entities.
- Conflicting drafts retain both bodies.
- Mobile navigation must expose account and sync status at 360px.

## Review Focus

- A pull interrupted halfway must be safe to retry without duplicate attempts; Task 2 tests it.
- A remote tombstone newer than a local entity must prevent resurrection; Task 2 tests it.
- Importing malformed or future-version JSON must leave the database unchanged; Task 4 tests transaction rollback.
- Signing out while a flush is running must not upload records under the next account; Task 3 tests user scoping.
- GitHub Pages without secrets must build into explicit offline mode instead of failing; Task 5 tests both configurations.

---

### Task 1: Supabase schema and row-level security

**Files:**
- Create: `supabase/migrations/002_complete_learning_sync.sql`
- Modify: `supabase/tests/rls.test.sql`
- Modify: `.env.example`

**Interfaces:**
- Consumes: local entity schemas from the first two plans.
- Produces: owned tables for attempts, drafts, review cards, task completions, knowledge states, exam sessions, settings, and tombstones.

- [ ] **Step 1: Extend failing RLS tests**

```sql
select throws_ok($$ insert into review_queue(user_id, question_id, priority, next_review_at)
values ('00000000-0000-0000-0000-000000000002', 'q1', 1, now()) $$, 'new row violates row-level security policy');
select is((select count(*) from attempts where user_id = auth.uid()), 1::bigint, 'owner sees only own attempts');
```

- [ ] **Step 2: Run Supabase database tests**

Run: `supabase test db`
Expected: FAIL because new columns/tables and policies do not exist. If Supabase CLI is unavailable, record that environment limitation and run the SQL parser check supplied by the migration test script added in this task.

- [ ] **Step 3: Create additive migration**

Add `content_version`, `kind`, `mode`, `device_id`, `updated_at` to attempts and create remaining owned tables with `user_id`, `updated_at`, and RLS `using` plus `with check`. Change the profile default exam date to `2026-12-12`.

- [ ] **Step 4: Run RLS tests and commit**

Run: `supabase test db`
Expected: PASS for owner reads/writes and cross-user rejection.

```bash
git add supabase .env.example
git commit -m "feat: secure complete learning sync schema"
```

### Task 2: Bidirectional merge engine

**Files:**
- Modify: `src/data/sync/SyncEngine.ts`
- Modify: `src/data/sync/SyncEngine.test.ts`
- Modify: `src/data/sync/SupabaseSyncRemote.ts`
- Modify: `src/data/repositories/DexieLearningRepository.ts`

**Interfaces:**
- Consumes: authenticated `userId` and all local learning entities.
- Produces: `pullSince(cursor)`, `mergeRemoteBatch(batch)`, `flush(userId)`, cursor persistence, tombstone handling, and retry-safe results.

- [ ] **Step 1: Write failing merge tests**

```ts
await engine.sync('user-1');
await engine.sync('user-1');
expect(await repo.listAttempts()).toHaveLength(1);
expect((await repo.getDrafts()).map(item => item.body)).toEqual(expect.arrayContaining(['phone', 'computer']));
expect(await repo.getReviewCard('q1')).toBeNull(); // newer tombstone wins
```

- [ ] **Step 2: Run sync tests**

Run: `pnpm test --run src/data/sync/SyncEngine.test.ts`
Expected: FAIL because the engine only pushes attempts and drafts.

- [ ] **Step 3: Implement typed operations and deterministic merge**

Expand operation kinds to all mutable entities. Pull pages ordered by `(updated_at, id)`, persist the cursor only after a transaction commits, union attempts by ID, choose newer mutable records, preserve draft conflicts, and apply tombstones before pushes.

- [ ] **Step 4: Run sync tests and commit**

Run: `pnpm test --run src/data/sync src/data/repositories/DexieLearningRepository.test.ts`
Expected: PASS for retry, tombstones, conflicts, and idempotence.

```bash
git add src/data
git commit -m "feat: synchronize learning data bidirectionally"
```

### Task 3: Observable account and sync lifecycle

**Files:**
- Modify: `src/data/sync/SyncCoordinator.tsx`
- Create: `src/data/sync/SyncContext.tsx`
- Create: `src/data/sync/SyncCoordinator.test.tsx`
- Modify: `src/components/SyncStatus.tsx`
- Modify: `src/features/auth/AccountPage.tsx`
- Modify: `src/layout/AppShell.tsx`

**Interfaces:**
- Consumes: merge engine and AuthProvider user.
- Produces: sync state `{ state, pendingCount, lastSyncedAt, retry }`, exponential retries, and user-scoped cancellation.

- [ ] **Step 1: Write failing lifecycle tests**

```ts
expect(screen.getByText('仅保存在本机')).toBeVisible();
expect(screen.getByText('1 条记录等待同步')).toBeVisible();
await auth.signOut();
await pendingFlush;
expect(remote.upsertAttempt).not.toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-2' }));
```

- [ ] **Step 2: Run lifecycle tests**

Run: `pnpm test --run src/data/sync/SyncCoordinator.test.tsx src/features/auth`
Expected: FAIL because no shared sync state or cancellation exists.

- [ ] **Step 3: Implement context, retry, and mobile status**

Use an AbortController per authenticated user, retry at 2s/5s/15s/60s while online, reset on manual retry, and show offline/local/pending/synced/error states in AccountPage and mobile navigation.

- [ ] **Step 4: Run lifecycle tests and commit**

Run: `pnpm test --run src/data/sync src/features/auth src/layout/AppShell.test.tsx`
Expected: PASS, including sign-out isolation.

```bash
git add src/data/sync src/components src/features/auth src/layout
git commit -m "feat: expose reliable sync status"
```

### Task 4: Transactional export, import, and local reset

**Files:**
- Create: `src/data/backup/learningBackup.ts`
- Create: `src/data/backup/learningBackup.test.ts`
- Create: `src/features/auth/DataManagement.tsx`
- Create: `src/features/auth/DataManagement.test.tsx`
- Modify: `src/features/auth/AccountPage.tsx`

**Interfaces:**
- Consumes: all Dexie learning tables.
- Produces: `exportLearningData(): LearningBackupV1`, `importLearningData(input: unknown)`, and `clearLocalLearningData()`.

- [ ] **Step 1: Write failing backup tests**

```ts
const backup = await exportLearningData(db);
expect(backup.schemaVersion).toBe(1);
await expect(importLearningData(db, { schemaVersion: 99 })).rejects.toThrow('Unsupported backup version');
expect(await db.attempts.count()).toBe(1);
```

Add malformed JSON and transaction rollback cases.

- [ ] **Step 2: Run backup tests**

Run: `pnpm test --run src/data/backup src/features/auth/DataManagement.test.tsx`
Expected: FAIL because backup modules do not exist.

- [ ] **Step 3: Implement Zod validation and transactional actions**

Export an ISO timestamp, schema version, content version, and all user-owned tables. Parse before opening the write transaction; import with ID-based merges. Require a typed confirmation phrase before clearing local data.

- [ ] **Step 4: Run backup tests and commit**

Run: `pnpm test --run src/data/backup src/features/auth`
Expected: PASS with unchanged data after invalid imports.

```bash
git add src/data/backup src/features/auth
git commit -m "feat: add learning data backup tools"
```

### Task 5: Production configuration and end-to-end release verification

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`
- Create: `scripts/verify-runtime-config.mts`
- Modify: `package.json`
- Modify: `tests/app.spec.ts`
- Create: `tests/offline-sync.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: GitHub Actions secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` when present.
- Produces: offline-safe and cloud-enabled builds plus a release verification command.

- [ ] **Step 1: Write failing build/e2e checks**

```ts
test('offline answers survive reload', async ({ context, page }) => {
  await context.setOffline(true);
  await page.goto('/listen');
  await page.getByLabel(/B\./).check();
  await page.getByRole('button', { name: '提交答案' }).click();
  await page.reload();
  await expect(page.getByText(/保存在本机/)).toBeVisible();
});
```

Make `verify-runtime-config.mts` assert that zero Supabase variables yields offline mode and both variables yields cloud mode; one variable alone exits 1.

- [ ] **Step 2: Run config and e2e checks**

Run: `pnpm runtime:verify && pnpm e2e`
Expected: FAIL because runtime verification and offline-sync e2e do not exist.

- [ ] **Step 3: Wire optional secrets and release checks**

Pass both GitHub secrets into the build step, fail only on partial configuration, document Supabase setup and migrations, and add a workflow verification step before artifact upload.

- [ ] **Step 4: Run full release verification**

Run: `pnpm content:validate && pnpm content:audit && pnpm audio:audit && pnpm test --run && pnpm e2e && pnpm typecheck && pnpm lint && pnpm build && pnpm pages:verify && pnpm runtime:verify`
Expected: every command exits 0.

- [ ] **Step 5: Commit**

```bash
git add .github package.json scripts tests README.md
git commit -m "chore: verify offline and synced production builds"
```
