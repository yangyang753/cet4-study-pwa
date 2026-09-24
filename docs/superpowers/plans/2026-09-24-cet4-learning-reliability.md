# CET-4 Learning Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the audited reliability gaps and complete a trustworthy adaptive CET-4 learning loop across practice, planning, mock exams, backup, and optional cloud sync.

**Architecture:** Keep the existing local-first React/Dexie architecture and introduce small deterministic domain helpers for study dates, question selection, diagnostic fallback, and score estimation. UI components consume those helpers; Supabase remains an optional replication target whose schema mirrors local IDs and owner scope.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, Testing Library, Playwright, Dexie 4, Supabase JS 2, PostgreSQL migrations, GitHub Pages PWA.

**Spec:** `docs/superpowers/specs/2026-09-24-cet4-learning-reliability-design.md`

## Global Constraints

- Preserve the current brand, navigation, responsive layout, 60-minute default plan, offline-first behavior, and GitHub Pages deployment.
- Use Asia/Shanghai for study-day ownership and UTC ISO timestamps for events.
- Do not add paid AI, third-party grading, speech recognition, or new runtime dependencies.
- Label all 710-point results as preparation estimates, never official CET-4 scores.
- Keep old IndexedDB data and schema-version-1 JSON backups readable.
- Cloud sync remains optional and must safely build in offline mode when both Supabase variables are absent.

## Review Focus

- A learner opening the app between 00:00 and 07:59 China time must receive the current China study date; Task 1 pins the UTC-boundary case.
- A learner who has attempted every candidate question must receive the least recently attempted questions, not an empty set or the same first five; Task 2 pins the exhausted-pool case.
- A diagnostic record containing legacy zeroes for untested writing and translation must not select either as the weakest diagnostic area; Task 3 pins legacy settings.
- A backup containing a queued daily-plan operation must import atomically into a fresh database; Task 6 pins the real repository round trip.
- Two authenticated users writing `2026-09-24:review` or `plan:2026-09-24` must not collide in PostgreSQL; Task 7 pins composite owner keys in the migration contract.

---

### Task 1: Centralize China Study Dates

**Files:**
- Create: `src/lib/studyDate.ts`
- Create: `src/lib/studyDate.test.ts`
- Modify: `src/features/mastery/taskProgress.ts`
- Modify: `src/features/dashboard/TodayPage.tsx`
- Modify: `src/features/exam/ExamSession.tsx`
- Modify: `src/features/review/ReviewPage.tsx`
- Modify: `src/features/auth/DataManagement.tsx`

**Interfaces:**
- Produces: `studyDate(date?: Date, timeZone?: string): string` and `previousStudyDate(date: string): string`.
- Consumes: native `Intl.DateTimeFormat`; no application state.

- [ ] **Step 1: Write the failing boundary tests**

```ts
it('uses the current China date while UTC is still on the previous day', () => {
  expect(studyDate(new Date('2026-09-24T16:30:00.000Z'))).toBe('2026-09-25');
});

it('returns the previous calendar study date across a month boundary', () => {
  expect(previousStudyDate('2026-10-01')).toBe('2026-09-30');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm vitest run src/lib/studyDate.test.ts`

Expected: FAIL because `studyDate.ts` does not exist.

- [ ] **Step 3: Implement the date helpers and replace direct UTC slices**

```ts
export function studyDate(date = new Date(), timeZone = 'Asia/Shanghai') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

export function previousStudyDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
```

Make `taskProgress.ts` re-export `studyDate` as `localStudyDate` temporarily so existing imports remain compatible, then migrate Today, Exam, Review, and backup filename generation to the shared helper.

- [ ] **Step 4: Run date and affected component tests**

Run: `pnpm vitest run src/lib/studyDate.test.ts src/features/dashboard/TodayPage.test.tsx src/features/mastery/taskProgress.test.ts src/features/exam/ExamSession.test.tsx src/features/review/ReviewPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/studyDate.ts src/lib/studyDate.test.ts src/features/mastery/taskProgress.ts src/features/dashboard/TodayPage.tsx src/features/exam/ExamSession.tsx src/features/review/ReviewPage.tsx src/features/auth/DataManagement.tsx
git commit -m "fix: use China study dates consistently"
```

### Task 2: Rotate Practice Questions and Balance Answers

**Files:**
- Create: `src/features/practice/selectPracticeQuestions.ts`
- Create: `src/features/practice/selectPracticeQuestions.test.ts`
- Modify: `src/content/catalog.ts`
- Modify: `src/content/catalog.test.ts`
- Modify: `src/content/contentAudit.ts`
- Modify: `src/content/contentAudit.test.ts`
- Modify: `scripts/audit-content.mts`
- Modify: `src/features/practice/ExerciseRunner.tsx`
- Modify: `src/features/practice/ExerciseRunner.test.tsx`

**Interfaces:**
- Produces: `selectPracticeQuestions(questions: CatalogQuestion[], attempts: Attempt[], options: { kind: PracticeKind; date: string; limit: number }): CatalogQuestion[]`.
- Produces: `rotateObjectiveOptions(options: QuestionOption[], correctAnswer: string, offset: number): { options: QuestionOption[]; correctAnswer: string }` inside `catalog.ts`.
- Produces: `auditGeneratedQuestions(groups: Partial<Record<PracticeKind, CatalogQuestion[]>>): string[]` in `contentAudit.ts`.
- Consumes: `LearningRepository.listAttempts()` and Task 1 `studyDate()`.

- [ ] **Step 1: Write failing selection and answer-distribution tests**

```ts
it('prefers unseen questions and then the least recently attempted', () => {
  const selected = selectPracticeQuestions(questions, attempts, { kind: 'reading', date: '2026-09-24', limit: 2 });
  expect(selected.map((item) => item.id)).toEqual(['q-unseen', 'q-oldest']);
});

it('returns a full set after every candidate has been attempted', () => {
  expect(selectPracticeQuestions(questions, allAttempted, { kind: 'reading', date: '2026-09-24', limit: 3 })).toHaveLength(3);
});

it('distributes vocabulary answers across all four positions', () => {
  expect(new Set(getPracticeItems('vocabulary').slice(0, 8).map((q) => 'correctAnswer' in q && q.correctAnswer))).toEqual(new Set(['A', 'B', 'C', 'D']));
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm vitest run src/features/practice/selectPracticeQuestions.test.ts src/content/catalog.test.ts`

Expected: FAIL because the selector is absent and catalog answers are all A.

- [ ] **Step 3: Implement deterministic least-recently-used selection**

Build a `Map<questionId, latestCreatedAt>`, partition unseen/seen, sort unseen by a stable hash of `${date}:${kind}:${question.id}`, sort seen by timestamp ascending with the same hash as tie-breaker, concatenate, and slice to `limit`. In `ExerciseRunner`, load attempts before rendering the runner; use one subjective question and five objective questions.

- [ ] **Step 4: Rotate generated vocabulary and grammar options**

For item index `i`, rotate the option text array by `i % optionCount`, regenerate option IDs from A upward, and set the correct answer to the ID now containing the original correct text. Implement `auditGeneratedQuestions` to reject duplicate option text and require every available answer position within the first eight vocabulary and grammar questions. Call it from `scripts/audit-content.mts` with `getPracticeItems('vocabulary')` and `getPracticeItems('grammar')` so the release audit checks generated questions, not only raw inventory counts.

- [ ] **Step 5: Run practice, catalog, and content-audit tests**

Run: `pnpm vitest run src/features/practice/selectPracticeQuestions.test.ts src/features/practice/ExerciseRunner.test.tsx src/content/catalog.test.ts src/content/contentAudit.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/practice/selectPracticeQuestions.ts src/features/practice/selectPracticeQuestions.test.ts src/features/practice/ExerciseRunner.tsx src/features/practice/ExerciseRunner.test.tsx src/content/catalog.ts src/content/catalog.test.ts src/content/contentAudit.ts src/content/contentAudit.test.ts scripts/audit-content.mts
git commit -m "feat: rotate practice questions and answer positions"
```

### Task 3: Make Diagnostic Results Drive the Daily Plan

**Files:**
- Modify: `src/features/diagnostic/diagnostic.ts`
- Modify: `src/features/diagnostic/DiagnosticPage.tsx`
- Modify: `src/features/diagnostic/DiagnosticPage.test.tsx`
- Modify: `src/features/dashboard/deriveDashboard.ts`
- Modify: `src/features/dashboard/deriveDashboard.test.ts`
- Modify: `src/features/planner/planDay.ts`
- Modify: `src/features/planner/planDay.test.ts`
- Modify: `src/features/dashboard/TodayPage.tsx`
- Modify: `src/features/dashboard/TodayPage.test.tsx`
- Modify: `src/domain/learning.ts`

**Interfaces:**
- Produces: `selectDiagnosticWeakSkill(levels?: Partial<Record<CoreStudyKind, number>>): CoreStudyKind | null` restricted to vocabulary, grammar, listening, and reading.
- Extends: `PlannerInput` with `diagnosticWeakSkill?: CoreStudyKind` and `hasRecentEvidence: boolean`; the diagnostic fallback is used only when `hasRecentEvidence` is false.
- Consumes: existing `DashboardMetrics.hasEnoughData` and `weakSkill`.

- [ ] **Step 1: Write failing diagnostic fallback and phase-rotation tests**

```ts
it('ignores legacy zeroes for untested writing and translation', () => {
  expect(selectDiagnosticWeakSkill({ vocabulary: .67, grammar: .33, listening: .67, reading: 1, writing: 0, translation: 0 })).toBe('grammar');
});

it('uses a diagnostic weakness during foundation week', () => {
  const plan = planDay({ ...base, diagnosticWeakSkill: 'grammar', hasRecentEvidence: false });
  expect(plan.tasks.some((task) => task.kind === 'grammar')).toBe(true);
});

it('rotates foundation work across grammar reading writing and translation', () => {
  const kinds = ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27'].map((date) => planDay({ ...base, date }).tasks[2].kind);
  expect(new Set(kinds)).toEqual(new Set(['grammar', 'reading', 'writing', 'translation']));
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm vitest run src/features/diagnostic/DiagnosticPage.test.tsx src/features/dashboard/deriveDashboard.test.ts src/features/planner/planDay.test.ts`

Expected: FAIL because diagnostic levels are not consumed and foundation is fixed to reading.

- [ ] **Step 3: Implement nullable diagnostic levels and visible result summary**

Change `diagnosticLevels` to `Partial<Record<CoreStudyKind, number>>`; `scoreDiagnostic` only writes categories actually tested. On completion, show the four percentages and the selected priority before the link to Today.

- [ ] **Step 4: Implement diagnostic fallback and calendar rotation**

Use recent evidence when `hasEnoughData`; otherwise use `selectDiagnosticWeakSkill`; otherwise derive the rotating kind from the UTC-safe date ordinal modulo four. Pass the resolved weakness and evidence flag from Today into `planDay`.

- [ ] **Step 5: Run diagnostic, planner, and dashboard tests**

Run: `pnpm vitest run src/features/diagnostic src/features/planner src/features/dashboard`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/diagnostic src/features/dashboard src/features/planner src/domain/learning.ts
git commit -m "feat: drive daily plans from diagnostic evidence"
```

### Task 4: Complete Grammar and Subjective Learning Evidence

**Files:**
- Modify: `src/features/practice/ExerciseRunner.tsx`
- Modify: `src/features/practice/ExerciseRunner.test.tsx`
- Modify: `src/features/composition/evaluateSubjective.ts`
- Modify: `src/features/composition/evaluateSubjective.test.ts`
- Modify: `src/features/composition/SubjectiveEditor.tsx`
- Modify: `src/features/composition/SubjectiveEditor.test.tsx`
- Modify: `src/features/dashboard/learningEvidence.test.ts`

**Interfaces:**
- Extends: `SubjectiveFeedback` with `score: number` and `passed: boolean` where `score = passedChecks / totalChecks` and `passed = score >= 0.6`.
- Changes: `SubjectiveEditor.onSubmit(body, feedback)` so ExerciseRunner persists `score` and `correct`.
- Consumes: existing `completeDailyTask`, `MasteryCheck`, and normalized attempt kinds.

- [ ] **Step 1: Write failing grammar completion and subjective scoring tests**

```ts
it('automatically completes grammar and opens its mastery check', async () => {
  render(<ExerciseRunner kind="grammar" limit={1} repository={repository} today="2026-09-24" />);
  // answer, submit, and finish
  expect(repository.completeTask).toHaveBeenCalledWith(expect.objectContaining({ kind: 'grammar' }));
  expect(screen.getByText('掌握检测')).toBeVisible();
});

it('turns rubric checks into a bounded local score', () => {
  expect(evaluateSubjective('writing', strongAnswer, []).score).toBeGreaterThanOrEqual(.6);
  expect(evaluateSubjective('writing', '', []).score).toBe(0);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm vitest run src/features/practice/ExerciseRunner.test.tsx src/features/composition/evaluateSubjective.test.ts`

Expected: FAIL because grammar is explicitly excluded and feedback has no score.

- [ ] **Step 3: Remove the grammar exclusion and persist subjective evidence**

Set `plannedKind = kind`; compute feedback once on submit; persist `correct: feedback.passed`, `score: feedback.score`, and the real practice kind. Keep the disclaimer visible and complete the corresponding daily task.

- [ ] **Step 4: Run practice, composition, evidence, and mastery tests**

Run: `pnpm vitest run src/features/practice src/features/composition src/features/dashboard/learningEvidence.test.ts src/features/mastery`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/practice src/features/composition src/features/dashboard/learningEvidence.test.ts
git commit -m "feat: record grammar and subjective mastery evidence"
```

### Task 5: Repair Mock Audio and Add a 710-Point Estimate

**Files:**
- Create: `src/features/exam/estimateCetScore.ts`
- Create: `src/features/exam/estimateCetScore.test.ts`
- Modify: `src/features/exam/ExamSession.tsx`
- Modify: `src/features/exam/ExamSession.test.tsx`
- Modify: `src/features/exam/ExamResult.tsx`
- Modify: `src/features/exam/ExamResult.test.tsx`
- Modify: `src/features/exam/summarizeExam.ts`
- Modify: `src/features/exam/exam.css`
- Modify: `tests/app.spec.ts`

**Interfaces:**
- Produces: `estimateCetScore(session: ExamSessionRecord, exam: ResolvedExam): { total: number; sections: Record<ExamSectionKind, number>; gapTo425: number }`.
- Consumes: `evaluateSubjective` for writing/translation and `publicAssetUrl` for audio.

- [ ] **Step 1: Write failing audio and score tests**

```ts
it('resolves mock audio under the configured public base path', () => {
  render(<ExamSession mockId="mock-1" repository={repository} />);
  fireEvent.click(screen.getByRole('button', { name: '完成写作并进入听力' }));
  expect(screen.getByLabelText('模考听力音频')).toHaveAttribute('src', expect.stringContaining('/cet4-study-pwa/audio/'));
});

it('returns zero for a blank exam and 710 for a fully correct strong exam', () => {
  expect(estimateCetScore(blankSession, exam).total).toBe(0);
  expect(estimateCetScore(perfectSession, exam).total).toBe(710);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm vitest run src/features/exam/estimateCetScore.test.ts src/features/exam/ExamSession.test.tsx src/features/exam/ExamResult.test.tsx`

Expected: FAIL because audio is unbased and no estimator exists.

- [ ] **Step 3: Implement base-aware audio and weighted score estimation**

Add `aria-label="模考听力音频"` and use `publicAssetUrl(question.audioSrc)` in `QuestionView`. Calculate listening and reading from objective correct/total, writing and translation from rubric score, multiply by 248.5/248.5/106.5/106.5, and round section display to one decimal and total to an integer.

- [ ] **Step 4: Render estimate, gap, and disclaimer**

Show total, four sections, and `距离 425 估计还差 N 分` when below 425 or `当前估分高于 425 分线 N 分` otherwise. Always render `备考估分基于本应用规则，不是官方 CET-4 标准分。`.

- [ ] **Step 5: Extend browser coverage into the listening section**

After advancing the mock to listening, assert the audio `src` contains the Pages base path and `request.get(src)` succeeds.

- [ ] **Step 6: Run exam unit and browser tests**

Run: `pnpm vitest run src/features/exam && pnpm e2e --grep "mock"`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/exam tests/app.spec.ts
git commit -m "feat: add reliable mock audio and CET score estimates"
```

### Task 6: Make Real Backups Round-Trip

**Files:**
- Modify: `src/data/backup/learningBackup.ts`
- Modify: `src/data/backup/learningBackup.test.ts`

**Interfaces:**
- Extends: backup `operationSchema.kind` and `tombstoneSchema.kind` with `plan`.
- Consumes: real `DexieLearningRepository.savePlan`, `exportLearningData`, and `importLearningData`.

- [ ] **Step 1: Add the failing real-repository round-trip test**

```ts
it('restores a backup containing a queued daily plan operation', async () => {
  const source = database();
  await new DexieLearningRepository(source).savePlan({ id: 'plan:2026-09-24', date: '2026-09-24', tasks: [], updatedAt: now });
  const backup = await exportLearningData(source);
  const target = database();
  await expect(importLearningData(target, backup)).resolves.toBeUndefined();
  expect(await target.plans.get('plan:2026-09-24')).toBeTruthy();
  expect((await target.syncQueue.toArray()).some((item) => item.kind === 'plan')).toBe(true);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm vitest run src/data/backup/learningBackup.test.ts`

Expected: FAIL with `Invalid backup file`.

- [ ] **Step 3: Add plan to both schemas without changing schemaVersion**

Use one shared `syncEntityKindSchema = z.enum(['attempt', 'draft', 'reviewCard', 'taskCompletion', 'knowledgeState', 'examSession', 'settings', 'plan'])`; extend operation kind with `tombstone`, and reuse the shared enum for tombstones.

- [ ] **Step 4: Run backup and repository tests**

Run: `pnpm vitest run src/data/backup/learningBackup.test.ts src/data/repositories/DexieLearningRepository.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/backup/learningBackup.ts src/data/backup/learningBackup.test.ts
git commit -m "fix: restore backups with queued daily plans"
```

### Task 7: Correct Owner-Scoped Supabase Migrations

**Files:**
- Modify: `supabase/migrations/004_daily_plans.sql`
- Create: `supabase/migrations/005_owner_scoped_keys.sql`
- Modify: `supabase/tests/rls.test.sql`
- Create: `scripts/verify-supabase-migrations.mts`
- Create: `scripts/verify-supabase-migrations.test.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/supabase-setup.md`

**Interfaces:**
- Produces: migration 004 that upgrades the 001 `daily_plans` table and migration 005 that owner-scopes deterministic text IDs.
- Produces: `pnpm supabase:verify` static contract check used by `release:verify` when no live database exists.

- [ ] **Step 1: Write failing migration-contract tests**

```ts
it('migrates daily plans instead of relying on create-table-if-missing', () => {
  expect(migration004).toContain('alter table public.daily_plans');
  expect(migration004).toContain('payload jsonb');
  expect(migration004).not.toContain('create table if not exists public.daily_plans');
});

it('owner-scopes deterministic text ids', () => {
  for (const table of ['daily_plans', 'review_queue', 'task_completions', 'knowledge_states', 'exam_sessions', 'tombstones']) {
    expect(allMigrations).toContain(`primary key (user_id, id)`);
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm vitest run scripts/verify-supabase-migrations.test.ts`

Expected: FAIL because 004 does not upgrade the old table and 005 is absent.

- [ ] **Step 3: Implement data-preserving migration 004**

Drop the old primary key, change `id` to text, add nullable `payload`, update every existing row to `id = 'plan:' || plan_date` and `payload = jsonb_build_object('id', ..., 'date', plan_date, 'tasks', tasks, 'updatedAt', updated_at)`, make payload not null, add primary key `(user_id, id)`, then drop `tasks` only after the update.

- [ ] **Step 4: Add migration 005 for deterministic text IDs**

For each owner table, discover and drop its current primary-key constraint in a PostgreSQL `do $$` block, then add `primary key (user_id, id)`. Do not alter attempts or drafts. Preserve existing owner policies and indexes.

Use this pattern for each table name in a fixed array rather than accepting dynamic user input:

```sql
do $$
declare table_name text; constraint_name text;
begin
  foreach table_name in array array['review_queue','task_completions','knowledge_states','exam_sessions','tombstones'] loop
    select con.conname into constraint_name
    from pg_constraint con
    where con.conrelid = format('public.%I', table_name)::regclass and con.contype = 'p';
    if constraint_name is not null then
      execute format('alter table public.%I drop constraint %I', table_name, constraint_name);
    end if;
    execute format('alter table public.%I add primary key (user_id, id)', table_name);
  end loop;
end $$;
```

- [ ] **Step 5: Repair pgTAP counts and add schema assertions**

Set `select plan(N)` to the actual number of assertions; assert `daily_plans.id` is text, `payload` is jsonb, owner policies exist, and each listed table has a two-column primary key containing `user_id` and `id`.

- [ ] **Step 6: Wire static verification into release verification and update setup docs**

Add `"supabase:verify": "tsx scripts/verify-supabase-migrations.mts"` and execute it before `runtime:verify`. Update instructions from migrations 001–004 to 001–005.

- [ ] **Step 7: Run migration and release-script tests**

Run: `pnpm vitest run scripts/verify-supabase-migrations.test.ts scripts/verify-runtime-config.test.ts && pnpm supabase:verify`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add supabase scripts/verify-supabase-migrations.mts scripts/verify-supabase-migrations.test.ts package.json README.md docs/supabase-setup.md
git commit -m "fix: align owner-scoped cloud sync schema"
```

### Task 8: Harden Offline Account and Auth Initialization

**Files:**
- Modify: `src/features/auth/AccountPage.tsx`
- Modify: `src/features/auth/LoginPage.test.tsx`
- Modify: `src/features/auth/AuthProvider.tsx`
- Modify: `src/features/auth/AuthProvider.test.tsx`

**Interfaces:**
- Changes: `AccountPage` renders `LoginPage` only when `cloudConfigured` is true.
- Changes: rejected `AuthService.getUser()` resolves UI state to `signedOut`; no uncaught promise and no permanent loading state.

- [ ] **Step 1: Write failing offline and rejected-session tests**

```tsx
it('does not offer cloud login while running locally only', async () => {
  render(<AuthProvider service={offlineService}><AccountPage cloudConfigured={false} /></AuthProvider>);
  expect(await screen.findByText('当前为离线体验模式。')).toBeVisible();
  expect(screen.queryByRole('button', { name: '登录' })).not.toBeInTheDocument();
});

it('leaves loading state when session recovery rejects', async () => {
  render(<AuthProvider service={{ ...service, getUser: () => Promise.reject(new Error('network')) }}><Probe /></AuthProvider>);
  expect(await screen.findByText('signedOut')).toBeVisible();
});
```

- [ ] **Step 2: Run auth tests and verify RED**

Run: `pnpm vitest run src/features/auth`

Expected: FAIL because the login form is visible offline and rejected recovery is uncaught.

- [ ] **Step 3: Implement the minimal offline and error states**

Conditionally render `LoginPage`; add `.catch(() => { if (active) { setUser(null); setStatus('signedOut'); } })` to initial recovery. Keep configured sign-in, sign-up, reset, and password recovery unchanged.

- [ ] **Step 4: Run auth tests**

Run: `pnpm vitest run src/features/auth`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth
git commit -m "fix: make offline account state truthful and resilient"
```

### Task 9: Full Regression, Live-Path Coverage, and Release

**Files:**
- Modify: `tests/app.spec.ts`
- Modify: `tests/offline-sync.spec.ts`
- Modify: `README.md`
- Modify: `.github/workflows/deploy-pages.yml` only if verification requires a missing command or environment value.

**Interfaces:**
- Consumes all previous tasks; produces no new domain API.
- Verifies desktop, 360px phone, offline PWA, backup, adaptive plan, mock audio, and release contracts.

- [ ] **Step 1: Add missing end-to-end assertions**

Extend the mobile flow to confirm offline account mode has no login button. Extend mock flow to fetch its listening audio successfully and confirm the result page contains `备考估分` plus the non-official disclaimer. Keep test data deterministic by using a fresh browser context.

- [ ] **Step 2: Run all browser tests in local and Pages-base modes**

Run: `pnpm e2e`

Run on PowerShell: `$env:GITHUB_ACTIONS='true'; pnpm e2e; $code=$LASTEXITCODE; Remove-Item Env:GITHUB_ACTIONS; exit $code`

Expected: 0 failures in both modes.

- [ ] **Step 3: Run complete release verification and security audit**

Run: `pnpm release:verify`

Run: `pnpm audit --prod`

Expected: all unit/browser/type/lint/build/content/audio/bundle/Pages/runtime/Supabase checks pass and no known production vulnerability is reported.

- [ ] **Step 4: Review the complete branch against the spec**

Run on PowerShell: `$base = git merge-base HEAD main; git diff --check "$base..HEAD"; git diff --stat "$base..HEAD"`. Inspect every listed file and confirm each of the ten success criteria has either a focused test or a documented external Supabase-project dependency.

- [ ] **Step 5: Commit final test and documentation adjustments**

```bash
git add tests README.md .github/workflows/deploy-pages.yml
git commit -m "test: cover the completed CET learning loop"
```

- [ ] **Step 6: Merge, push, and verify GitHub Pages**

Fast-forward the approved branch into `main`, rerun `pnpm release:verify` on merged `main`, push `origin main`, wait for the matching GitHub Actions run to finish successfully, and verify:

```text
https://yangyang753.github.io/cet4-study-pwa/
https://yangyang753.github.io/cet4-study-pwa/audio/v1/listen-01.wav
```

Expected: app and audio return 200; account page reports offline mode until Supabase is configured. Do not claim cross-device sync is live without a real project and two-account RLS verification.
