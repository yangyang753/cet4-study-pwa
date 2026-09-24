# Cloud Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable secure, offline-first synchronization of all learning state between phone and desktop through Supabase.

**Architecture:** Keep Dexie as the immediate source of truth and extend the existing operation queue with cached plans. Supabase receives user-owned rows protected by RLS; clients pull, merge, then flush local operations.

**Tech Stack:** Dexie 4, Supabase JS 2, PostgreSQL/RLS, Vitest, Playwright, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-09-24-cet4-cloud-adaptive-completion-design.md`

## Global Constraints

- Browser configuration uses only Project URL and `sb_publishable_...` Publishable Key.
- Never store or request a Supabase Secret Key or `service_role` key in the web app or repository.
- Offline learning must continue when Supabase is unavailable.
- Pull and merge happen before flushing local operations on a newly signed-in device.
- Existing local records must survive database upgrades.

## Review Focus

- A blank local database on a new device must not overwrite populated remote data.
- Operations created while signed out must be safely claimed once by the signed-in user.
- Two devices modifying a draft must preserve a conflict copy rather than silently drop text.
- A partial environment configuration must fail deployment before building.
- RLS must reject cross-user reads and writes on every synchronized table, including plans.

---

### Task 1: Add cached plans to the local synchronization model

**Files:**
- Modify: `src/data/sync/SyncEngine.ts`
- Modify: `src/data/localDb.ts`
- Modify: `src/data/repositories/DexieLearningRepository.ts`
- Modify: `src/data/repositories/DexieLearningRepository.test.ts`
- Modify: `src/data/sync/SyncEngine.test.ts`

**Interfaces:**
- Extends: `OperationKind` with `'plan'`
- Consumes/produces: existing `CachedPlan { id; date; tasks; updatedAt }`

- [ ] **Step 1: Write failing queue tests**

```ts
await repository.savePlan({ id: 'plan:2026-09-24', date: '2026-09-24', tasks, updatedAt: now });
expect(await repository.list()).toContainEqual(expect.objectContaining({ kind: 'plan', entityId: 'plan:2026-09-24' }));
```

Also assert saving the same plan ID twice leaves one plan row and a valid latest operation.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `pnpm test --run src/data/repositories/DexieLearningRepository.test.ts src/data/sync/SyncEngine.test.ts`

Expected: FAIL because `plan` is not a synchronization operation.

- [ ] **Step 3: Implement queued plan persistence**

Add `plan` to `OperationKind` and `tableNames`. Change `savePlan` to use the same `saveMutable` transaction pattern as settings, with `updatedAt` as the conflict clock. Keep the existing Dexie `plans` store and add a version 5 schema declaration without deleting data.

- [ ] **Step 4: Add remote-merge coverage**

Assert newer remote plan replaces older local plan, older remote plan does not replace newer local plan, and unrelated dates coexist.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test --run src/data/repositories/DexieLearningRepository.test.ts src/data/sync/SyncEngine.test.ts`

Expected: PASS.

```bash
git add src/data
git commit -m "feat: synchronize cached daily plans"
```

### Task 2: Add the Supabase plans table and complete RLS verification

**Files:**
- Create: `supabase/migrations/004_daily_plans.sql`
- Modify: `supabase/tests/rls.test.sql`
- Modify: `src/data/sync/SupabaseSyncRemote.ts`
- Modify: `src/data/sync/SupabaseSyncRemote.test.ts`

**Interfaces:**
- Maps: operation kind `plan` to table `daily_plans`
- Row shape: `{ id, user_id, plan_date, payload, updated_at }`

- [ ] **Step 1: Write failing remote mapping tests**

Assert a plan upsert targets `daily_plans`, includes the authenticated `user_id`, date, full plan payload and `updated_at`; assert pulled rows become `RemoteRecord { kind: 'plan', ... }`.

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm test --run src/data/sync/SupabaseSyncRemote.test.ts`

Expected: FAIL because no plan table mapping exists.

- [ ] **Step 3: Add migration**

```sql
create table if not exists public.daily_plans (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.daily_plans enable row level security;
create policy daily_plans_owner on public.daily_plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index daily_plans_owner_updated on public.daily_plans(user_id, updated_at, id);
```

- [ ] **Step 4: Extend RLS test coverage**

Add assertions for same-user select/upsert and cross-user select/update rejection for `daily_plans`, plus a table-list assertion covering attempts, drafts, review queue, completions, knowledge, exams, settings, tombstones and plans.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test --run src/data/sync/SupabaseSyncRemote.test.ts`

Expected: PASS. Run SQL tests against the linked test project during Task 5.

```bash
git add supabase src/data/sync
git commit -m "feat: add secure remote daily plans"
```

### Task 3: Migrate runtime configuration to a Publishable Key

**Files:**
- Modify: `.env.example`
- Modify: `src/vite-env.d.ts`
- Modify: `src/lib/supabase.ts`
- Modify: `scripts/verify-runtime-config.mts`
- Modify: `scripts/verify-runtime-config.test.ts`
- Modify: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Produces: `determineRuntimeMode(environment): 'offline' | 'cloud'`

- [ ] **Step 1: Write failing configuration tests**

```ts
expect(determineRuntimeMode({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' })).toBe('cloud');
expect(() => determineRuntimeMode({ VITE_SUPABASE_URL: 'https://x.supabase.co' })).toThrow(/provided together/);
expect(() => determineRuntimeMode({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'service_role_x' })).toThrow(/Publishable Key/);
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm test --run scripts/verify-runtime-config.test.ts`

Expected: FAIL because the app still reads `VITE_SUPABASE_ANON_KEY`.

- [ ] **Step 3: Implement the configuration rename and validation**

Read the Publishable Key in `createConfiguredSupabaseClient`, update Vite typings and CI secrets, and reject blank, mismatched, or clearly privileged key formats. The key value must never be printed.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm test --run scripts/verify-runtime-config.test.ts && pnpm runtime:verify && pnpm typecheck`

Expected: PASS in offline mode locally and no secret output.

```bash
git add .env.example .github/workflows/deploy-pages.yml src/lib src/vite-env.d.ts scripts/verify-runtime-config.mts scripts/verify-runtime-config.test.ts
git commit -m "chore: use Supabase publishable runtime key"
```

### Task 4: Harden sync ownership, retry state, and cross-device merge

**Files:**
- Modify: `src/data/sync/SyncEngine.ts`
- Modify: `src/data/sync/SyncEngine.test.ts`
- Modify: `src/data/sync/SyncCoordinator.tsx`
- Modify: `src/data/sync/SyncCoordinator.test.tsx`
- Modify: `src/components/SyncStatus.tsx`
- Create: `src/components/SyncStatus.test.tsx`

**Interfaces:**
- Preserves: `SyncEngine.sync(userId, signal)` pull-before-flush order
- Produces: user-facing states `local | offline | pending | syncing | synced | error`

- [ ] **Step 1: Add failing merge-order and ownership tests**

Record remote method calls and assert `pullSince` completes before the first upsert. Assert unowned operations are assigned to the current user once, while operations owned by a different user remain queued and are never uploaded.

- [ ] **Step 2: Add failing state tests**

Assert offline with pending records shows the count; a failed sync preserves the count and exposes retry; a successful retry records `lastSyncedAt`; online events trigger another sync without remounting.

- [ ] **Step 3: Run and confirm failures**

Run: `pnpm test --run src/data/sync/SyncEngine.test.ts src/data/sync/SyncCoordinator.test.tsx`

Expected: at least the ownership/error-detail assertions fail before implementation.

- [ ] **Step 4: Implement safe ownership and readable errors**

Keep pull-before-flush. Attach current ownership before upload, skip other-user records, preserve attempts on error, and expose a sanitized `lastError` string through `SyncContext`; do not expose server payloads or credentials.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test --run src/data/sync src/components/SyncStatus.test.tsx`

Expected: PASS.

```bash
git add src/data/sync src/components
git commit -m "fix: harden offline cross-device synchronization"
```

### Task 5: Create and verify the real Supabase project

**Files:**
- Modify: `README.md`
- Create: `docs/supabase-setup.md`
- Create: `tests/cloud-sync.spec.ts`
- Modify: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Requires user-owned values: Project URL and Publishable Key only
- Test environment: `E2E_SUPABASE_EMAIL`, `E2E_SUPABASE_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

- [ ] **Step 1: User creates the free project**

Guide the user to sign in to Supabase, create a project in the nearest suitable region, record the Project URL and `sb_publishable_...` key, and add the deployed GitHub Pages URL to Auth redirect URLs. Never request the project password or Secret Key in chat.

- [ ] **Step 2: Link CLI and apply all migrations**

Run: `pnpm dlx supabase@latest login`

Run: `pnpm dlx supabase@latest link`

Select the user-created project from the CLI prompt, then run: `pnpm dlx supabase@latest db push`

Expected: migrations `001` through `004` are applied. The project ref must come from the user’s dashboard, not be guessed or committed.

- [ ] **Step 3: Run database security tests**

Run: `pnpm dlx supabase@latest test db`

Expected: all RLS assertions pass, including cross-user rejection for `daily_plans`.

- [ ] **Step 4: Add a two-context cloud E2E test**

The test logs two independent Playwright contexts into the same dedicated test account, completes one small task in context A, waits for sync, reloads context B, and asserts the completion appears. A second case sets A offline, records an answer, restores network, and verifies B receives it.

- [ ] **Step 5: Configure GitHub secrets and deploy**

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to repository Actions secrets through the GitHub UI or authenticated CLI. Do not echo their values. Push the branch only after `pnpm release:verify` passes.

- [ ] **Step 6: Verify production and commit documentation**

Open the deployed phone and desktop URL, confirm the account page no longer says offline mode, and verify a real low-risk test completion syncs both ways.

```bash
git add README.md docs/supabase-setup.md tests/cloud-sync.spec.ts .github/workflows/deploy-pages.yml
git commit -m "docs: add verified Supabase deployment workflow"
```
