# Official Mock and Dashboard Upgrade Implementation Plan

> **Spec:** `docs/superpowers/specs/2026-09-28-official-mock-dashboard-upgrade-design.md`

## Global constraints

- Use TDD for every behavior change.
- Preserve version-5 local data and active exam recovery.
- Keep all training content labeled as original simulation.
- Do not claim cloud sync or background reminders when runtime configuration cannot provide them.
- Keep the 360 px layout free of horizontal overflow and keyboard accessible.

## Task 1: Enforce the official CET-4 blueprint

**Files:** `src/features/exam/examBlueprint.ts`, `src/features/exam/examBlueprint.test.ts`, `src/content/contentAudit.ts`, `src/content/contentAudit.test.ts`, `content/v1/mockExams.json`

1. Add failing tests requiring 7/8/10 listening and 10/10/10 reading subtype counts for all six mocks.
2. Add failing audit tests for a total-correct but subtype-wrong mock.
3. Implement deterministic subtype selection with unique question IDs inside each mock.
4. Update mock metadata and audits, run focused tests, then full unit suite.
5. Commit `feat: enforce official CET-4 mock blueprint`.

## Task 2: Add cloze and matching exam interactions

**Files:** `src/features/exam/examQuestionFormat.ts`, `src/features/exam/examQuestionFormat.test.ts`, `src/features/exam/ExamQuestionView.tsx`, `src/features/exam/ExamQuestionView.test.tsx`, `src/features/exam/ExamSession.tsx`, `src/features/exam/exam.css`, `src/domain/content.ts`

1. Add failing format tests for one 15-item cloze bank/10 blanks and A–J matching choices.
2. Add failing component tests proving cloze and matching do not render as ordinary four-option radios.
3. Implement format derivation and accessible controls while preserving per-question string answers.
4. Verify resume, autosave, scoring, and mobile layout.
5. Commit `feat: add official cloze and matching interactions`.

## Task 3: Repair sprint scheduling

**Files:** `src/features/planner/planDay.ts`, `src/features/planner/planDay.test.ts`, `src/features/dashboard/TodayPage.tsx`

1. Add failing tests requiring 60-minute sprint weekdays and one deterministic 125-minute full-mock day.
2. Add `sectional-mock` planning and copy; retain `mock` for full sessions.
3. Render the full-mock exception clearly on Today.
4. Run planner/dashboard tests and full unit suite.
5. Commit `fix: align sprint plans with mock duration`.

## Task 4: Strengthen translation and subjective evidence

**Files:** `src/features/translation/evaluateTranslation.ts`, related tests, `QuestionTranslationGate.tsx`, `src/features/composition/subjectiveEvidence.ts`, related tests

1. Add failing tests rejecting random/too-short Chinese and unrelated English keyword padding.
2. Require meaningful segment length and conservative auditable-word coverage.
3. Improve displayed feedback without claiming human grading.
4. Run focused and full unit tests.
5. Commit `feat: strengthen learning evidence checks`.

## Task 5: Redesign the Today page as a premium cockpit

**Files:** `src/features/dashboard/TodayPage.tsx`, `src/features/dashboard/dashboard.css`, `src/features/dashboard/TodayPage.test.tsx`, `src/styles/tokens.css`, `tests/app.spec.ts`

1. Add failing component/browser assertions for mission header, learning route, evidence summary, and responsive hierarchy.
2. Refactor the page into visual sections without changing repository contracts.
3. Add polished desktop/mobile styling, visible focus states, reduced-motion support, and 200% text resilience.
4. Run dashboard tests and targeted Playwright tests.
5. Commit `feat: redesign the study dashboard`.

## Task 6: Add provenance, backup health, and honest readiness guidance

**Files:** `src/features/dashboard/TodayPage.tsx`, `src/features/auth/DataManagement.tsx`, `src/features/auth/AccountPage.tsx`, `README.md`, `content/v1/LICENSE.md`, related tests

1. Add failing tests for stale/no-backup warnings in offline mode and clear content provenance.
2. Persist last successful export timestamp and surface backup health on Today/account pages.
3. Add an exam-format/source note and keep the Supabase setup path explicit.
4. Run focused tests and full unit suite.
5. Commit `feat: surface backup health and content provenance`.

## Task 7: Release verification and deployment

**Files:** release tests and docs only if verification exposes a defect.

1. Run content/audio audits, unit tests, Playwright, typecheck, lint, build, bundle, Pages, Supabase and runtime checks.
2. Run production dependency audit and structured self-review because no subagent tool is available.
3. Fix Important/Critical findings with RED→GREEN tests.
4. Merge to `main`, push GitHub, wait for Pages success, and smoke-test the live 390 px site.

## Review focus

- Official subtype counts and interactions must match the public CET-4 structure.
- A 60-minute plan must never silently link to a required 125-minute session.
- Translation gates must reject meaningless input without blocking legitimate concise Chinese.
- Legacy IndexedDB and active exam records must remain recoverable.
- Offline/cloud copy must remain truthful.
- The visual redesign must remain usable at 360 px and 200% text.

