# CET-4 Comprehensive Experience and Quality Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the navigation, deep-link reliability, sync readiness, content diversity, subjective assessment, reporting, reminders, and browser coverage without losing existing learning data.

**Architecture:** Keep the existing local-first Dexie repository and Supabase sync engine as the single data path. Add small presentation/domain helpers for shell summaries, Hash URLs, weekly reporting, and conservative subjective evidence; strengthen generated content and audits at the content boundary instead of scattering exceptions through UI components.

**Tech Stack:** React 19, TypeScript 6, React Router 7, Dexie 4, Supabase JS 2, Vite/PWA, Vitest, Testing Library, Playwright, axe-core.

**Spec:** `docs/superpowers/specs/2026-09-27-comprehensive-experience-and-quality-upgrade-design.md`

## Global Constraints

- Do not delete, reset, overwrite, or silently migrate away existing IndexedDB, localStorage, or cloud learning records.
- Do not commit Supabase secrets, service-role keys, GitHub tokens, or other credentials.
- Cloud mode is enabled only when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` exist.
- Keep all exam material explicitly labeled as original simulation based on CET-4 formats and public topic patterns; do not copy full official papers.
- Subjective scoring remains conservative and must state that it is not official or human marking.
- Support desktop and 360 px mobile browsers, keyboard navigation, screen-reader semantics, and `prefers-reduced-motion`.
- Preserve offline use and the existing GitHub Pages deployment.

## Review Focus

- An existing version-5 IndexedDB with attempts, review cards, settings, and an active mock must open after the upgrade with identical record counts; Task 7 adds a browser migration test.
- A legacy `/review?source=reminder` URL must migrate to `/#/review?source=reminder` without dropping the query; Task 2 adds the redirect test.
- One missing Supabase environment variable must fail configuration validation, while both missing must remain valid local-only mode; Task 3 pins both cases.
- Repeated filler, copied reference text, or keyword stuffing must not make writing/translation stable mastery; Task 5 adds adversarial tests.
- At 360 px with reduced motion and 200% text zoom, navigation must remain operable without horizontal scrolling; Task 8 adds the browser test.

---

### Task 1: Rich desktop sidebar and compact mobile navigation

**Files:**
- Create: `src/layout/deriveShellSummary.ts`
- Create: `src/layout/SidebarStudySummary.tsx`
- Create: `src/layout/MobileMoreMenu.tsx`
- Modify: `src/layout/AppShell.tsx`
- Modify: `src/styles/global.css`
- Test: `src/layout/deriveShellSummary.test.ts`
- Test: `src/layout/AppShell.test.tsx`

**Interfaces:**
- Produces: `deriveShellSummary(snapshot: DashboardSnapshot, today: string): { completed: number; total: number; dueReviews: number; daysToExam: number; phaseLabel: string }`.
- Produces: `SidebarStudySummary({ repository?, today? })` using the existing `LearningRepository` only.
- Produces: `MobileMoreMenu()` with the non-primary routes `exam`, `knowledge`, `account`, and `print`.

- [ ] **Step 1: Write failing shell-summary tests**

Add tests named `derives today completion and due review totals` and `clamps past exam countdown to zero`; assert exact completed/total, due count, phase label, and zero-day behavior.

- [ ] **Step 2: Run the summary tests and verify RED**

Run: `pnpm test --run src/layout/deriveShellSummary.test.ts`

Expected: FAIL because `deriveShellSummary` does not exist.

- [ ] **Step 3: Implement `deriveShellSummary` and `SidebarStudySummary`**

Use `DashboardSnapshot`, existing task completions, review cards, and settings. Do not write data from the shell.

- [ ] **Step 4: Write failing navigation structure tests**

Update `AppShell.test.tsx` to assert grouped desktop navigation labels, `aria-current`, an accessible today progress bar, a local-backup shortcut, exactly four primary mobile destinations, and a “更多” menu containing the remaining routes.

- [ ] **Step 5: Run the shell tests and verify RED**

Run: `pnpm test --run src/layout/AppShell.test.tsx`

Expected: FAIL on missing groups, summary, and more menu.

- [ ] **Step 6: Implement the shell markup and responsive styling**

Use a 278 px desktop rail with brand/phase header, three named nav groups, progress card, and sync card. Keep mobile navigation fixed to four primary items and expose the rest through an accessible dialog/menu.

- [ ] **Step 7: Run Task 1 tests and verify GREEN**

Run: `pnpm test --run src/layout/deriveShellSummary.test.ts src/layout/AppShell.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/layout src/styles/global.css
git commit -m "feat: redesign study navigation shell"
```

### Task 2: Hash routing, canonical links, and legacy deep-link migration

**Files:**
- Create: `src/lib/appHref.ts`
- Create: `src/lib/appHref.test.ts`
- Create: `src/app/LegacyPathRedirect.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/layout/AppShell.tsx`
- Modify: `src/components/StudyReminder.tsx`
- Modify: `src/features/auth/LoginPage.tsx`
- Modify: `src/features/auth/PasswordRecoveryPage.tsx`
- Modify: `src/features/dashboard/TodayPage.tsx`
- Modify: `src/features/diagnostic/DiagnosticPage.tsx`
- Modify: `src/features/knowledge/KnowledgePage.tsx`
- Modify: `src/features/mastery/MasteryCheck.tsx`
- Modify: `src/features/mastery/SubjectiveMasteryCheck.tsx`
- Modify: `vite.config.ts`
- Modify: `scripts/verify-github-pages-build.mts`
- Modify: `tests/app.spec.ts`

**Interfaces:**
- Produces: `appHref(path: string, search?: string): string`, returning `${BASE_URL}#/<normalized path><search>`.
- Produces: `legacyPathToHash(pathname: string, search: string, base: string): string | null` preserving query parameters.
- Consumes: all navigation introduced by Task 1.

- [ ] **Step 1: Write failing canonical-link and migration tests**

Assert `today`, `/review`, and `practice/vocabulary` produce Hash URLs; assert `/cet4-study-pwa/review?source=reminder` becomes `/cet4-study-pwa/#/review?source=reminder`; assert a root Hash URL is unchanged.

- [ ] **Step 2: Run URL tests and verify RED**

Run: `pnpm test --run src/lib/appHref.test.ts`

Expected: FAIL because the helpers do not exist.

- [ ] **Step 3: Implement URL helpers and switch to `createHashRouter`**

Centralize route URL creation. Replace raw base concatenation without altering non-route asset URLs.

- [ ] **Step 4: Update PWA and 404 fallback generation**

Set manifest `start_url` to `${base}#/today`. Generate a small 404 redirect document that maps legacy pathname/query to the Hash URL, rather than copying `index.html` unchanged.

- [ ] **Step 5: Extend GitHub Pages and Playwright checks**

Assert the built manifest start URL, 404 redirect script, Hash refresh behavior, and legacy query preservation.

- [ ] **Step 6: Run Task 2 verification and verify GREEN**

Run: `pnpm test --run src/lib/appHref.test.ts && pnpm build && pnpm pages:verify && pnpm e2e`

Expected: all commands PASS.

- [ ] **Step 7: Commit**

```bash
git add src vite.config.ts scripts/verify-github-pages-build.mts tests/app.spec.ts
git commit -m "fix: make mobile deep links reliable"
```

### Task 3: Cloud-sync deployment readiness and account guidance

**Files:**
- Create: `src/lib/runtimeConfiguration.ts`
- Create: `src/lib/runtimeConfiguration.test.ts`
- Modify: `src/lib/runtime.ts`
- Modify: `scripts/verify-runtime-config.mts`
- Modify: `src/features/auth/AccountPage.tsx`
- Modify: `src/features/auth/AccountPage.test.tsx`
- Modify: `src/components/SyncStatus.tsx`
- Create: `src/components/SyncStatus.test.tsx`
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Produces: `resolveRuntimeConfiguration(env: RuntimeEnv): { mode: 'offline' } | { mode: 'cloud'; url: string; publishableKey: string }`, throwing when exactly one field is present.
- Consumes: existing `createConfiguredSupabaseClient`, `SyncCoordinator`, JSON backup flow, and Task 1 sync card.

- [ ] **Step 1: Write failing runtime matrix tests**

Cover neither variable, both valid variables, URL only, key only, malformed URL, and service-role-looking key rejection.

- [ ] **Step 2: Run runtime tests and verify RED**

Run: `pnpm test --run src/lib/runtimeConfiguration.test.ts`

Expected: FAIL because the resolver does not exist.

- [ ] **Step 3: Implement the resolver and reuse it in browser/build paths**

Keep offline mode valid only when both variables are absent; do not log credential values.

- [ ] **Step 4: Write failing account/sync copy tests**

Assert local mode presents export/import guidance and never renders login; cloud mode explains merge ownership, last synchronization time, pending records, and manual retry.

- [ ] **Step 5: Implement account and sync status UI**

Do not alter sync conflict semantics. Add deployment instructions for GitHub Secrets without embedding values.

- [ ] **Step 6: Run Task 3 verification and verify GREEN**

Run: `pnpm test --run src/lib/runtimeConfiguration.test.ts src/features/auth/AccountPage.test.tsx src/components/SyncStatus.test.tsx && pnpm runtime:verify`

Expected: PASS in local-only mode. Record in the execution ledger that production cloud activation remains externally blocked if secrets are absent.

- [ ] **Step 7: Commit**

```bash
git add src/lib src/features/auth src/components README.md .env.example scripts/verify-runtime-config.mts
git commit -m "feat: clarify and validate cloud sync readiness"
```

### Task 4: Listening and reading template diversity

**Files:**
- Modify: `scripts/generate-content.mts`
- Create: `src/content/questionDiversity.ts`
- Create: `src/content/questionDiversity.test.ts`
- Modify: `src/content/contentAudit.ts`
- Modify: `src/content/contentAudit.test.ts`
- Modify: `content/v1/listeningSets.json`
- Modify: `content/v1/readingSets.json`
- Modify: `src/domain/content.ts`
- Modify: `src/content/catalog.ts`

**Interfaces:**
- Produces: `QuestionSkillTag = 'detail' | 'reason' | 'purpose' | 'action' | 'attitude' | 'inference' | 'main-idea' | 'paraphrase' | 'vocabulary-in-context' | 'reference' | 'paragraph-role' | 'structure'`.
- Produces: `auditQuestionTemplateDiversity(sets, kind): string[]`, normalizing topic/theme text before calculating repetition.
- Consumes: unchanged `getPracticeItems` and catalog question IDs so saved attempts remain valid.

- [ ] **Step 1: Write failing diversity tests against current content**

Assert each listening/reading bank contains required skill tags, normalized unique template ratio is at least 60%, and no template exceeds 15% of its bank. Assert distractors are unique and no known fixed irrelevant option appears in more than 5% of questions.

- [ ] **Step 2: Run diversity tests and verify RED**

Run: `pnpm test --run src/content/questionDiversity.test.ts src/content/contentAudit.test.ts`

Expected: FAIL with the current 7 listening and 6 reading templates.

- [ ] **Step 3: Implement the audit and typed skill tag**

Keep IDs stable. Make the audit explain the offending normalized shape and frequency.

- [ ] **Step 4: Re-author/generated-diversify listening questions**

Use transcript evidence to distribute required skill tags and topic-related distractors across all 24 sets. Preserve answers, audio references, and segment timing where the tested fact is unchanged.

- [ ] **Step 5: Re-author/generated-diversify reading questions**

Use passage evidence to distribute required reading tags across all 30 sets. Preserve set IDs and six questions per set.

- [ ] **Step 6: Run content validation and verify GREEN**

Run: `pnpm content:validate && pnpm content:audit && pnpm test --run src/content/questionDiversity.test.ts src/content/contentAudit.test.ts src/content/catalog.test.ts`

Expected: PASS; 24 listening sets, 30 reading sets, 150 listening questions, and 180 reading questions remain available.

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-content.mts src/content src/domain/content.ts content/v1/listeningSets.json content/v1/readingSets.json
git commit -m "feat: diversify listening and reading questions"
```

### Task 5: Conservative subjective evidence and error routing

**Files:**
- Create: `src/features/composition/subjectiveEvidence.ts`
- Create: `src/features/composition/subjectiveEvidence.test.ts`
- Modify: `src/features/composition/evaluateSubjective.ts`
- Modify: `src/features/composition/evaluateSubjective.test.ts`
- Modify: `src/features/composition/SubjectiveEditor.tsx`
- Modify: `src/features/mastery/SubjectiveMasteryCheck.tsx`
- Modify: `src/features/mastery/SubjectiveMasteryCheck.test.tsx`
- Modify: `src/features/diagnostic/diagnostic.ts`
- Modify: `src/features/diagnostic/diagnosticScore.test.ts`
- Modify: `src/features/review/ReviewPage.tsx`

**Interfaces:**
- Produces: `SubjectiveErrorCode = 'length' | 'structure' | 'task-coverage' | 'sentence-boundary' | 'predicate' | 'linking' | 'repetition' | 'filler' | 'target-word' | 'named-detail' | 'reference-copy'`.
- Produces: `analyzeSubjectiveEvidence(kind, body, question): { checks: SubjectiveCheck[]; errorCodes: SubjectiveErrorCode[]; score: number; passed: boolean; stableEligible: boolean }`.
- Consumes: existing `SubjectiveQuestion`, `ReviewCard`, and mastery state APIs.

- [ ] **Step 1: Write failing adversarial evidence tests**

Test repeated filler, keyword-only translation, copied reference answer, missing named number/detail, no predicate, valid paraphrase, and a valid 120–180-word structured essay. Assert no single rule-only submission returns `stableEligible: true`.

- [ ] **Step 2: Run evidence tests and verify RED**

Run: `pnpm test --run src/features/composition/subjectiveEvidence.test.ts`

Expected: FAIL because the analyzer does not exist.

- [ ] **Step 3: Implement conservative evidence analysis**

Return explainable checks and error codes. Do not claim grammar correctness beyond the explicit heuristics.

- [ ] **Step 4: Route failed evidence into review and delayed mastery**

Use the analyzer in editor, diagnostic, review, and mastery flows. First submission may complete a task but only a later closed-book mastery check can mark it mastered. Preserve existing draft/autosave behavior.

- [ ] **Step 5: Cap diagnostic subjective confidence conservatively**

Update `scoreDiagnostic` so locally rule-graded writing/translation cannot alone produce a high-confidence estimate; retain the ±55 reference range and the official-score disclaimer.

- [ ] **Step 6: Run Task 5 verification and verify GREEN**

Run: `pnpm test --run src/features/composition src/features/mastery/SubjectiveMasteryCheck.test.tsx src/features/diagnostic/diagnosticScore.test.ts src/features/review/ReviewPage.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/composition src/features/mastery src/features/diagnostic src/features/review
git commit -m "feat: make subjective mastery evidence conservative"
```

### Task 6: Weekly learning report

**Files:**
- Create: `src/features/dashboard/weeklyLearningReport.ts`
- Create: `src/features/dashboard/weeklyLearningReport.test.ts`
- Create: `src/features/dashboard/WeeklyLearningReport.tsx`
- Modify: `src/features/dashboard/TodayPage.tsx`
- Modify: `src/features/dashboard/dashboard.css`
- Modify: `src/features/dashboard/TodayPage.test.tsx`

**Interfaces:**
- Produces: `buildWeeklyLearningReport(snapshot: DashboardSnapshot, today: string): WeeklyLearningReport` containing active days, attempts, per-kind accuracy, mastered count, lapse count, recent mock minimum, and next priorities.
- Consumes: existing attempts, task completions, knowledge states, and submitted exam sessions only.

- [ ] **Step 1: Write failing weekly aggregation tests**

Cover empty data, seven-day boundary, weighted study kinds, mastered/lapse totals, fewer than three mocks, and three-mock minimum.

- [ ] **Step 2: Run report tests and verify RED**

Run: `pnpm test --run src/features/dashboard/weeklyLearningReport.test.ts`

Expected: FAIL because the builder does not exist.

- [ ] **Step 3: Implement report builder and accessible report panel**

Render an expandable panel on TodayPage; do not create new persistence.

- [ ] **Step 4: Run Task 6 verification and verify GREEN**

Run: `pnpm test --run src/features/dashboard/weeklyLearningReport.test.ts src/features/dashboard/TodayPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard
git commit -m "feat: add weekly learning report"
```

### Task 7: Exam-date confirmation and honest reminder capability

**Files:**
- Modify: `src/domain/learning.ts`
- Modify: `src/domain/learning.test.ts`
- Modify: `src/data/backup/learningBackup.ts`
- Modify: `src/data/backup/learningBackup.test.ts`
- Modify: `src/features/settings/LearningSettings.tsx`
- Modify: `src/features/settings/LearningSettings.test.tsx`
- Create: `src/features/settings/ExamDateConfirmation.tsx`
- Modify: `src/features/dashboard/TodayPage.tsx`
- Modify: `src/components/StudyReminder.tsx`
- Modify: `src/components/StudyReminder.test.tsx`

**Interfaces:**
- Adds optional `examDateConfirmedAt?: string` to `UserSettings` without changing the IndexedDB schema version.
- Produces: `reminderCapability(configuredCloud: boolean, notificationPermission: NotificationPermission): { background: boolean; message: string }`.
- Consumes: Task 2 `appHref` and existing settings persistence.

- [ ] **Step 1: Write failing settings normalization and backup tests**

Assert old settings without confirmation still parse, confirmation round-trips through backup, and importing old backups preserves all records.

- [ ] **Step 2: Run compatibility tests and verify RED**

Run: `pnpm test --run src/domain/learning.test.ts src/data/backup/learningBackup.test.ts`

Expected: FAIL on missing confirmation behavior.

- [ ] **Step 3: Implement optional confirmation and TodayPage card**

Show the card only when unconfirmed or when the exam date changes after confirmation. Link to school-notice guidance without claiming a national date.

- [ ] **Step 4: Write failing reminder capability tests**

Assert static/offline mode says reminders require the app to be open; cloud mode without a push backend must still return `background: false`; never claim background notifications from Notification permission alone.

- [ ] **Step 5: Implement honest reminder copy and settings UI**

Keep existing in-app timers. Do not add a nonfunctional push subscription.

- [ ] **Step 6: Run Task 7 tests and verify GREEN**

Run: `pnpm test --run src/domain/learning.test.ts src/data/backup/learningBackup.test.ts src/features/settings/LearningSettings.test.tsx src/components/StudyReminder.test.tsx src/features/dashboard/TodayPage.test.tsx`

Expected: PASS with both old and new settings data.

- [ ] **Step 7: Commit**

```bash
git add src/domain src/data/backup src/features/settings src/features/dashboard src/components
git commit -m "feat: confirm exam date and clarify reminders"
```

### Task 8: Whole-app mobile, accessibility, migration, and release coverage

**Files:**
- Modify: `tests/app.spec.ts`
- Modify: `tests/offline-sync.spec.ts`
- Create: `tests/navigation-migration.spec.ts`
- Modify: `scripts/verify-github-pages-build.mts`
- Modify: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Consumes: shell summary from Task 1, Hash URLs from Task 2, runtime mode from Task 3, diversified content from Task 4, and all UI added in Tasks 5–7.
- Produces: no application API; this task is the final release gate.

- [ ] **Step 1: Add failing full-route mobile and axe coverage**

Test `today`, `listen`, `practice`, `review`, `exam`, `knowledge`, `account`, and `print` at 360 px. For every route assert no horizontal overflow and no serious/critical axe violation.

- [ ] **Step 2: Add failing zoom/reduced-motion navigation coverage**

At 200% emulated text sizing and reduced motion, open the mobile More menu, visit every secondary route, and verify focus returns to the trigger after close.

- [ ] **Step 3: Add existing-data migration coverage**

Seed a version-5 database with attempts, settings, review cards, knowledge states, and an active mock; load the upgraded app and assert identical counts plus a recoverable mock.

- [ ] **Step 4: Run browser tests and fix only demonstrated integration defects**

Run: `pnpm e2e`

Expected: PASS after integration fixes; every fix must receive a focused regression assertion first.

- [ ] **Step 5: Run complete verification**

Run: `pnpm release:verify && pnpm audit --prod --audit-level moderate`

Expected: all unit tests, browser tests, typecheck, lint, build, bundle budget, content audit, PWA, Pages, Supabase migration, runtime configuration, and dependency audit PASS.

- [ ] **Step 6: Commit**

```bash
git add tests scripts .github src
git commit -m "test: verify complete mobile learning experience"
```

- [ ] **Step 7: Push and verify production**

Push the completed branch only under the user's standing authorization to deploy this app. Wait for GitHub Pages success, verify the live root and Hash routes return HTTP 200, confirm the current ReviewPage and shell assets, and report whether cloud sync remains externally blocked by missing secrets.
