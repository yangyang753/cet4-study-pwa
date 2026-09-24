# CET-4 Quality Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace repetitive practice content and close the remaining progress, settings, PWA, and deployment-readiness gaps in the CET-4 study application.

**Architecture:** Keep the existing React/Dexie/PWA architecture. Improve content through explicit scenario datasets plus release audits, centralize user-configurable study settings in the existing repository, and add small focused UI components for validation, retry, readiness, and installation.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, Playwright, Dexie, vite-plugin-pwa, Supabase adapter, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-24-cet4-quality-completion-design.md`

## Global Constraints

- Preserve the current visual identity, offline-first behavior, A4 printing, GitHub Pages URL, and automatic daily-plan completion.
- Keep the existing content inventory counts and six 125-minute mock exams.
- Use original CET-4-style simulations and never label them as official past papers.
- Require at least 80 English words for writing and at least 15 English words plus ending punctuation for translation completion.
- Daily minutes must stay within 20–180; playback rate must be one of 0.75, 1, 1.25, or 1.5.
- Cross-device sync remains explicitly unavailable when Supabase runtime variables are absent.
- Every production behavior change requires a test observed failing before implementation.

## Review Focus

- Imported legacy settings without readiness fields must receive safe defaults without losing diagnostic data.
- A save that rejects after an answer is graded must never allow advancing or completing the task until retry succeeds.
- A restored knowledge state must appear mastered after a hard reload, not merely remain in IndexedDB.
- Content normalization must catch cosmetic theme substitution while allowing genuinely different scenarios.
- iOS browsers without `beforeinstallprompt` must receive instructions rather than a dead install button.

---

### Task 1: Enforce and replace repetitive content

**Files:**
- Modify: `scripts/generate-content.mts`
- Modify: `scripts/expand-mock-content.mts`
- Modify: `src/content/contentAudit.ts`
- Modify: `src/content/contentAudit.test.ts`
- Modify: `scripts/audit-content.mts`
- Modify: `content/v1/listeningSets.json`
- Modify: `content/v1/readingSets.json`
- Modify: `content/v1/translations.json`
- Modify: `content/v1/writingPrompts.json`
- Modify: `content/v1/inventory.json`
- Modify: `public/audio/v1/*.wav`

**Interfaces:**
- Produces: `auditContentDiversity(inventory): string[]` and unchanged JSON schemas consumed by `contentCatalog`.
- Consumes: existing mock references and audio paths.

- [ ] Add failing audit tests proving repeated normalized transcripts/passages, low prompt diversity, missing audio references, and strongly biased answers are rejected.
- [ ] Run `pnpm test --run src/content/contentAudit.test.ts`; expect the new tests to fail because diversity auditing is absent.
- [ ] Implement `auditContentDiversity` and include it in `pnpm content:audit`.
- [ ] Replace generator scenario data with 24 distinct listening scripts, 30 distinct reading passages, and varied writing/translation structures; regenerate JSON and matching audio.
- [ ] Run `pnpm content:validate && pnpm content:audit && pnpm audio:audit && pnpm test --run src/content/contentAudit.test.ts`; expect all checks to pass.
- [ ] Commit with `feat: diversify CET practice content`.

### Task 2: Make subjective completion evidence valid

**Files:**
- Create: `src/features/composition/validateSubjectiveSubmission.ts`
- Create: `src/features/composition/validateSubjectiveSubmission.test.ts`
- Modify: `src/features/composition/SubjectiveEditor.tsx`
- Modify: `src/features/composition/SubjectiveEditor.test.tsx`
- Modify: `src/features/practice/ExerciseRunner.test.tsx`

**Interfaces:**
- Produces: `validateSubjectiveSubmission(kind, body): { valid: boolean; message: string }`.
- Consumes: existing `SubjectiveEditor` callback and draft persistence.

- [ ] Add failing unit/component tests for empty, short, valid, and punctuation-missing submissions, including proof that invalid submissions do not invoke `onSubmit`.
- [ ] Run the focused tests; expect failures showing the current unconditional submit behavior.
- [ ] Implement validation, accessible error copy, disabled/guarded completion, and retained drafts.
- [ ] Run focused tests and the full Vitest suite; expect all tests to pass.
- [ ] Commit with `fix: require valid subjective practice evidence`.

### Task 3: Restore mastery state and make saves retryable

**Files:**
- Modify: `src/features/knowledge/KnowledgePage.tsx`
- Modify: `src/features/knowledge/KnowledgePage.test.tsx`
- Modify: `src/features/practice/ExerciseRunner.tsx`
- Modify: `src/features/practice/ExerciseRunner.test.tsx`
- Modify: `tests/offline-sync.spec.ts`

**Interfaces:**
- Produces: hydrated knowledge state and retryable attempt persistence.
- Consumes: `LearningRepository.getDashboardSnapshot`, `saveAttemptOnce`, and existing review-card writes.

- [ ] Add failing tests for mastery hydration after remount and for a rejected save followed by a successful retry.
- [ ] Run focused tests; expect reload state and retry assertions to fail.
- [ ] Load mastered item IDs from the repository, expose a retry button on save failure, and prevent Next/Finish until the transaction succeeds.
- [ ] Extend browser coverage for a hard reload and run focused plus full tests.
- [ ] Commit with `fix: preserve mastery and retry failed answers`.

### Task 4: Add learning settings and readiness reminders

**Files:**
- Modify: `src/domain/learning.ts`
- Modify: `src/data/backup/learningBackup.ts`
- Modify: `src/features/auth/AccountPage.tsx`
- Create: `src/features/settings/LearningSettings.tsx`
- Create: `src/features/settings/LearningSettings.test.tsx`
- Create: `src/features/dashboard/ExamReadiness.tsx`
- Create: `src/features/dashboard/ExamReadiness.test.tsx`
- Modify: `src/features/dashboard/TodayPage.tsx`
- Modify: `src/features/review/ReviewPage.tsx`
- Modify: `src/features/listening/ListeningPage.tsx`
- Modify: `src/features/listening/useSegmentPlayer.ts`
- Modify: affected repository, backup, sync, and page tests.

**Interfaces:**
- Produces: `ExamReadinessState`, settings normalization, `LearningSettings`, and date-aware reminder rendering.
- Consumes: `LearningRepository.saveUserSettings` and `DashboardSnapshot.settings`.

- [ ] Add failing tests for legacy-setting defaults, bounds validation, saved settings, review-date propagation, default playback speed, and final-14/final-3-day reminders.
- [ ] Run focused tests; expect failures because UI and normalization do not exist and Review uses a constant.
- [ ] Extend `UserSettings` compatibly, implement the settings form/readiness component, and connect all consumers to stored settings.
- [ ] Run focused tests, backup/sync tests, and the full Vitest suite.
- [ ] Commit with `feat: add configurable study settings and exam readiness`.

### Task 5: Complete installability and routed-page accessibility

**Files:**
- Create: `src/components/PwaInstallHelp.tsx`
- Create: `src/components/PwaInstallHelp.test.tsx`
- Modify: `src/features/auth/AccountPage.tsx`
- Modify: `src/features/practice/ExerciseRunner.tsx`
- Modify: `vite.config.ts`
- Modify: `index.html`
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`
- Create: `public/icon-maskable-512.png`
- Create: `public/apple-touch-icon.png`
- Modify: `tests/app.spec.ts`
- Modify: `scripts/verify-github-pages-build.mts`

**Interfaces:**
- Produces: install-help UI and complete manifest/icon metadata.
- Consumes: browser `beforeinstallprompt` when available, otherwise platform-neutral instructions.

- [ ] Add failing tests for prompt-supported install, fallback instructions, objective-route `h1`, and required manifest icons.
- [ ] Run focused and Pages tests; expect failures because install UI, heading, and PNG assets are absent.
- [ ] Implement the component, headings, metadata, and generated PNG icon assets.
- [ ] Run component, E2E, accessibility, and Pages verification.
- [ ] Commit with `feat: complete mobile installation and accessibility`.

### Task 6: Harden release configuration and deploy

**Files:**
- Modify: `docs/supabase-setup.md`
- Modify: `scripts/verify-runtime-config.mts`
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `tests/app.spec.ts`

**Interfaces:**
- Produces: explicit cloud/offline release reporting and final deployed application.
- Consumes: optional `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` GitHub secrets.

- [ ] Add a failing runtime-contract test/check that reports cloud activation prerequisites without exposing secret values and keeps zero-variable builds valid offline.
- [ ] Implement explicit workflow/runtime reporting and update setup documentation with migration and two-device verification steps.
- [ ] Run `pnpm release:verify` and `pnpm audit --prod`; expect zero failures and no known vulnerabilities.
- [ ] Self-review the full branch because no subagent tool is available; fix every Critical/Important finding with red-green tests.
- [ ] Merge to `main`, rerun `pnpm release:verify`, push GitHub, wait for the matching Pages action, and verify the application and an audio asset return HTTP 200.
- [ ] Commit with `chore: verify complete CET study release` when documentation or verification files changed after the prior task.

