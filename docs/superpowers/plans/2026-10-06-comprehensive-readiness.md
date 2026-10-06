# CET-4 Comprehensive Readiness Implementation Plan

> **For Codex:** Use `superpowers:executing-plans` to implement this plan task by task in an isolated worktree. TDD is mandatory for every behavior change.

**Spec:** `docs/superpowers/specs/2026-10-06-comprehensive-readiness-design.md`

**Goal:** Add a fully separate, evidence-tested foundation vocabulary channel; enrich high-value vocabulary with word families and confusables; and close the audited diagnostic, pronunciation, reminder, sync-readiness, and quality-control gaps without breaking existing learner data.

**Architecture:** Keep the original 800-word `learningVocabulary` catalog and IDs unchanged. Add a parallel `foundationVocabulary` catalog with `f`-prefixed IDs and a shared `VocabularyLayer` discriminator. Reuse the current warmup, strict recall, mastery, and review scheduling engines through explicit catalog/layer inputs, while keeping routes, queues, task completion, filters, and statistics separate. Store word-family/confusable content in a focused enrichment catalog keyed by vocabulary ID. Limit cross-cutting UX improvements to existing diagnostic, settings/account, reminder, and pronunciation components.

**Tech stack:** React 19, TypeScript, Vite, Vitest/Testing Library, Dexie/IndexedDB, Playwright, GitHub Pages, optional Supabase.

## Global constraints

- Preserve all existing `v0001`–style IDs and learner records.
- Foundation IDs use `f0001`–style IDs; enrichment IDs use stable source/target IDs.
- Foundation and core sessions, mistakes, progress, and task completion never mix in learner-facing views.
- Neither channel exposes a manual “已掌握” action.
- Only failed targets create or retain mistake evidence; correct targets never enter a mistake queue.
- Do not commit Supabase credentials, generated secrets, copyrighted exam papers, or third-party word-list dumps.
- Use concise CET-relevant meanings and natural original examples.
- Keep 360 px, keyboard, 200% zoom, offline reload, print, backup compatibility, and GitHub Pages base-path behavior working.

## File structure

### New files

- `content/v1/foundationVocabulary.json` — exactly 180 curated foundation entries.
- `content/v1/vocabularyEnrichment.json` — word-family and confusable groups for at least 120 high-impact entries/groups.
- `src/content/foundationVocabulary.ts` — typed catalog loader and foundation-specific audit.
- `src/content/vocabularyEnrichment.ts` — typed enrichment loader, lookup helpers, and integrity audit.
- `src/features/vocabulary/vocabularyLayer.ts` — `VocabularyLayer`, ID classification, layer labels, and catalog resolution.
- `src/features/vocabulary/FoundationVocabularyPage.tsx` — separate foundation library/status entry point.
- `src/features/vocabulary/EnrichmentRecallExercise.tsx` — no-hint family/confusable recall UI.
- corresponding `.test.ts` / `.test.tsx` files beside each module.

### Modified files

- `src/domain/content.ts` — optional vocabulary layer and typed enrichment interfaces.
- `src/domain/learning.ts` — task/review metadata needed to distinguish foundation/core routes additively.
- `src/content/catalog.ts`, `src/content/contentAudit.ts`, content tests/scripts — expose and validate both catalogs and enrichment.
- `src/features/vocabulary/*` — make session selection, warmup, recall, strict grading, scheduling, and mastery catalog/layer-aware.
- `src/features/review/ReviewPage.tsx` and tests — dedicated foundation/core mistake filters and catalog resolution.
- `src/features/knowledge/KnowledgePage.tsx` and tests — separate entry points, counts, filters, and enrichment disclosures.
- `src/features/dashboard/TodayPage.tsx`, `src/features/planner/planDay.ts`, and tests — separate foundation/core tasks and completion evidence.
- `src/features/practice/ExerciseRunner.tsx`, `src/app/router.tsx`, navigation tests — foundation route wiring.
- `src/features/diagnostic/*`, `src/features/exam/*`, `src/features/composition/*` — provisional-score and rule-check wording/eligibility.
- `src/features/vocabulary/PronounceButton.tsx` and tests — explicit voice/error states.
- `src/components/StudyReminder.tsx`, `src/features/settings/LearningSettings.tsx`, account/settings tests — reminder capability and calendar fallback.
- `src/features/auth/AccountPage.tsx`, `src/lib/runtimeConfiguration.ts`, sync/settings tests — cloud-readiness checklist without credentials.
- backup schemas/tests and Playwright journeys — additive compatibility and end-to-end coverage.

## Interfaces

```ts
export type VocabularyLayer = 'foundation' | 'core';

export interface VocabularyEntry {
  // existing fields unchanged
  layer?: VocabularyLayer; // missing means core for legacy data
}

export interface VocabularyFamilyMember {
  word: string;
  partOfSpeech: string;
  meaningZh: string;
}

export interface VocabularyConfusable {
  word: string;
  distinctionZh: string;
  example: string;
}

export interface VocabularyEnrichment {
  vocabularyId: string;
  family: VocabularyFamilyMember[];
  confusables: VocabularyConfusable[];
}

export function catalogForLayer(layer: VocabularyLayer): VocabularyEntry[];
export function vocabularyLayerOf(wordId: string): VocabularyLayer;
export function enrichmentFor(wordId: string): VocabularyEnrichment | null;
```

`ReviewCard.knowledgeKind` remains compatible with existing `vocabulary`; layer is resolved from the stable item/word ID unless an additive optional `vocabularyLayer` field materially simplifies backup and sync. Any new field must be optional and default to `core` for old records.

## Task 1: Add the foundation vocabulary and enrichment catalogs

**Files:**

- Create: `content/v1/foundationVocabulary.json`
- Create: `content/v1/vocabularyEnrichment.json`
- Create: `src/content/foundationVocabulary.ts`
- Create: `src/content/foundationVocabulary.test.ts`
- Create: `src/content/vocabularyEnrichment.ts`
- Create: `src/content/vocabularyEnrichment.test.ts`
- Create: `src/features/vocabulary/vocabularyLayer.ts`
- Create: `src/features/vocabulary/vocabularyLayer.test.ts`
- Modify: `src/domain/content.ts`
- Modify: `src/content/contentAudit.ts`
- Modify: `src/content/contentAudit.test.ts`
- Modify: `scripts/validate-content.mjs`

**Step 1 — RED:** Write tests requiring exactly 180 unique foundation entries, `f`-prefixed stable IDs, no overlap with the existing 800 words, required audited words, complete phonetic/POS/meaning/example data, concise meanings, and natural examples containing the target form.

**Step 2 — RED:** Write enrichment tests requiring known vocabulary references, no self/duplicate targets, non-empty family/confusable explanations, and coverage of at least 120 source entries/groups. Include explicit fixtures for `develop/development/developmental`, `economy/economic/economical`, `responsible/responsibility`, `affect/effect`, `adapt/adopt`, `access/assess`, and `rise/raise/arise`.

**Step 3 — Verify RED:** Run:

```powershell
pnpm vitest run src/content/foundationVocabulary.test.ts src/content/vocabularyEnrichment.test.ts src/features/vocabulary/vocabularyLayer.test.ts src/content/contentAudit.test.ts
```

Expected: failures for missing catalogs/types/helpers.

**Step 4 — GREEN:** Add the typed catalogs and audits. Curate meanings to common CET senses only; use original natural examples. Implement `catalogForLayer`, `vocabularyLayerOf`, and `enrichmentFor`. Treat a missing legacy layer as `core`.

**Step 5 — Verify GREEN:** Re-run the Task 1 command and `pnpm content:validate`.

Expected: all selected tests pass and both content validations exit 0.

**Step 6 — Commit:**

```powershell
git add -- content/v1/foundationVocabulary.json content/v1/vocabularyEnrichment.json src/domain/content.ts src/content src/features/vocabulary/vocabularyLayer.ts src/features/vocabulary/vocabularyLayer.test.ts scripts/validate-content.mjs
git commit -m "feat: add foundation vocabulary and enrichment catalogs"
```

## Task 2: Make vocabulary scheduling and recall layer-aware

**Files:**

- Modify: `src/features/vocabulary/vocabularySchedule.ts`
- Modify: `src/features/vocabulary/vocabularySchedule.test.ts`
- Modify: `src/features/vocabulary/selectWarmupWords.ts`
- Modify: `src/features/vocabulary/selectWarmupWords.test.ts`
- Modify: `src/features/vocabulary/DailyVocabularySession.tsx`
- Modify: `src/features/vocabulary/DailyVocabularySession.test.tsx`
- Modify: `src/features/vocabulary/VocabularyWarmup.tsx`
- Modify: `src/features/vocabulary/StrictVocabularyCheckView.tsx`
- Modify: `src/features/vocabulary/VocabularyRecallExercise.tsx`
- Create: `src/features/vocabulary/EnrichmentRecallExercise.tsx`
- Create: `src/features/vocabulary/EnrichmentRecallExercise.test.tsx`

**Step 1 — RED:** Add tests proving foundation and core workloads are calculated from separate catalogs/states; each recalls the previous day's learned words before new words; overdue review can produce a review-only day; completing one layer does not complete the other.

**Step 2 — RED:** Add deterministic recall tests covering English→Chinese, Chinese→English, single-mask spelling, learned-word Chinese→English sentence, family transformation, and confusable contrast. Assert each prompt hides exactly one target dimension and failed grading returns only the affected vocabulary ID.

**Step 3 — Verify RED:** Run:

```powershell
pnpm vitest run src/features/vocabulary/vocabularySchedule.test.ts src/features/vocabulary/selectWarmupWords.test.ts src/features/vocabulary/DailyVocabularySession.test.tsx src/features/vocabulary/VocabularyRecallExercise.test.tsx src/features/vocabulary/EnrichmentRecallExercise.test.tsx
```

Expected: new layer/enrichment cases fail before implementation.

**Step 4 — GREEN:** Parameterize the existing session by `layer`, catalog, task ID, and completion callback. Reuse grading/mastery primitives; do not fork two engines. Integrate enrichment recall only when the source word has enrichment. Preserve strict no-manual-mastery behavior.

**Step 5 — Verify GREEN:** Re-run the Task 2 command.

Expected: all selected tests pass.

**Step 6 — Commit:**

```powershell
git add -- src/features/vocabulary
git commit -m "feat: support independent foundation vocabulary learning"
```

## Task 3: Separate foundation/core mistake queues and routes

**Files:**

- Modify: `src/domain/learning.ts`
- Modify: `src/features/review/ReviewPage.tsx`
- Modify: `src/features/review/ReviewPage.test.tsx`
- Modify: `src/features/mastery/knowledgeMastery.ts`
- Modify: `src/features/mastery/knowledgeMastery.test.ts`
- Modify: `src/features/practice/ExerciseRunner.tsx`
- Modify: `src/features/practice/ExerciseRunner.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `tests/app.spec.ts`

**Step 1 — RED:** Add repository/UI tests with one failed foundation word and one failed core word. Assert the foundation mistake view shows only the foundation item, the core view shows only the core item, and a correct foundation answer is absent from both mistake queues.

**Step 2 — RED:** Add demotion tests proving a previously mastered foundation word returns to learning/review after a failed retention check while an unrelated correct word stays mastered.

**Step 3 — Verify RED:** Run:

```powershell
pnpm vitest run src/features/review/ReviewPage.test.tsx src/features/mastery/knowledgeMastery.test.ts src/features/practice/ExerciseRunner.test.tsx
```

Expected: separation/demotion cases fail.

**Step 4 — GREEN:** Resolve vocabulary catalogs by ID/layer; add explicit foundation/core review filters and route parameters; save attempts with stable layer-aware task/question IDs; update only the failed target's review card and knowledge state.

**Step 5 — Verify GREEN:** Re-run Task 3 tests, then:

```powershell
pnpm playwright test tests/app.spec.ts --grep "foundation|review"
```

Expected: unit tests and focused browser journey pass.

**Step 6 — Commit:**

```powershell
git add -- src/domain/learning.ts src/features/review src/features/mastery src/features/practice src/app/router.tsx tests/app.spec.ts
git commit -m "feat: separate foundation and core mistake review"
```

## Task 4: Add separate Today tasks and knowledge-library entry points

**Files:**

- Create: `src/features/vocabulary/FoundationVocabularyPage.tsx`
- Create: `src/features/vocabulary/FoundationVocabularyPage.test.tsx`
- Modify: `src/features/knowledge/KnowledgePage.tsx`
- Modify: `src/features/knowledge/KnowledgePage.test.tsx`
- Modify: `src/features/dashboard/TodayPage.tsx`
- Modify: `src/features/dashboard/TodayPage.test.tsx`
- Modify: `src/features/planner/planDay.ts`
- Modify: `src/features/planner/planDay.test.ts`
- Modify: `src/features/mastery/taskProgress.ts`
- Modify: `src/features/mastery/taskProgress.test.ts`
- Modify: `src/layout/AppShell.tsx`
- Modify: `src/layout/AppShell.test.tsx`
- Modify: `src/styles/global.css`

**Step 1 — RED:** Add planner tests for separate `foundationVocabulary` and `vocabulary` tasks within the configured daily minutes, due review priority, exam-date quota pressure, and independent task completion.

**Step 2 — RED:** Add component tests requiring separate Today actions/counts; foundation library tabs/counts; no mixing of foundation/core cards; and enrichment details only where present.

**Step 3 — Verify RED:** Run:

```powershell
pnpm vitest run src/features/planner/planDay.test.ts src/features/mastery/taskProgress.test.ts src/features/dashboard/TodayPage.test.tsx src/features/knowledge/KnowledgePage.test.tsx src/features/vocabulary/FoundationVocabularyPage.test.tsx
```

Expected: new task kind and separate UI cases fail.

**Step 4 — GREEN:** Add the new study kind/task copy/route. Split the current vocabulary time allocation between due review, foundation essentials, and core words without increasing total configured minutes. Add separate compact UI entry points and status counts; do not add manual mastery controls.

**Step 5 — Verify GREEN:** Re-run Task 4 tests and the 360 px/200% accessibility Playwright test.

Expected: selected unit and accessibility journeys pass.

**Step 6 — Commit:**

```powershell
git add -- src/features/vocabulary/FoundationVocabularyPage.tsx src/features/vocabulary/FoundationVocabularyPage.test.tsx src/features/knowledge src/features/dashboard src/features/planner src/features/mastery src/app
git commit -m "feat: surface separate foundation vocabulary route"
```

## Task 5: Tighten diagnostic and subjective-score boundaries

**Files:**

- Modify: `src/features/diagnostic/DiagnosticPage.tsx`
- Modify: `src/features/diagnostic/DiagnosticPage.test.tsx`
- Modify: `src/features/exam/ExamResult.tsx`
- Modify: `src/features/exam/ExamResult.test.tsx`
- Modify: `src/features/composition/SubjectiveEditor.tsx`
- Modify: `src/features/composition/SubjectiveEditor.test.tsx`
- Modify: `src/features/dashboard/TodayPage.tsx`

**Step 1 — RED:** Add tests requiring the quick result to display 20-item sample size, “初步估分”, uncertainty range, and three-full-mock readiness requirement. Add tests ensuring a local subjective pass is labeled task/rule completion and cannot alone create stable CET mastery copy.

**Step 2 — Verify RED:** Run:

```powershell
pnpm vitest run src/features/diagnostic/DiagnosticPage.test.tsx src/features/exam/ExamResult.test.tsx src/features/composition/SubjectiveEditor.test.tsx src/features/dashboard/TodayPage.test.tsx
```

Expected: at least the new explicit-copy/eligibility assertions fail.

**Step 3 — GREEN:** Centralize concise assessment-limit copy and update result/dashboard surfaces. Do not change objective-score math or claim human grading.

**Step 4 — Verify GREEN:** Re-run Task 5 tests.

Expected: selected tests pass.

**Step 5 — Commit:**

```powershell
git add -- src/features/diagnostic src/features/exam src/features/composition src/features/dashboard
git commit -m "fix: clarify diagnostic and subjective assessment limits"
```

## Task 6: Improve pronunciation, reminders, and cloud readiness

**Files:**

- Modify: `src/features/vocabulary/PronounceButton.tsx`
- Modify: `src/features/vocabulary/PronounceButton.test.tsx`
- Modify: `src/components/StudyReminder.tsx`
- Modify: `src/components/StudyReminder.test.tsx`
- Modify: `src/features/settings/LearningSettings.tsx`
- Modify: `src/features/settings/LearningSettings.test.tsx`
- Modify: `src/features/auth/AccountPage.tsx`
- Modify: account tests
- Modify: `src/lib/runtimeConfiguration.ts`
- Modify: `src/lib/runtimeConfiguration.test.ts`

**Step 1 — RED:** Add pronunciation tests for unsupported API, no English voice, synthesis error, and successful playback. Add reminder tests distinguishing in-app, foreground notification, calendar fallback, and unavailable background push.

**Step 2 — RED:** Add account/runtime tests requiring a local-mode deployment checklist, complete-pair validation, malformed URL rejection, service-role rejection, and no login UI when unconfigured.

**Step 3 — Verify RED:** Run:

```powershell
pnpm vitest run src/features/vocabulary/PronounceButton.test.tsx src/components/StudyReminder.test.tsx src/features/settings src/features/auth src/lib/runtimeConfiguration.test.ts
```

Expected: new state/checklist assertions fail.

**Step 4 — GREEN:** Implement error callbacks/voice checks, explicit capability copy, calendar fallback link/control using the existing settings pattern, and the deployment-readiness checklist. Never request notification permission on mount and never add secrets.

**Step 5 — Verify GREEN:** Re-run Task 6 tests.

Expected: selected tests pass.

**Step 6 — Commit:**

```powershell
git add -- src/features/vocabulary/PronounceButton.tsx src/features/vocabulary/PronounceButton.test.tsx src/components src/features/settings src/features/auth src/lib/runtimeConfiguration.ts src/lib/runtimeConfiguration.test.ts
git commit -m "feat: improve browser capability and sync guidance"
```

## Task 7: Preserve backups, sync payloads, print, and offline behavior

**Files:**

- Modify: `src/data/backup/learningBackup.ts`
- Modify: `src/data/backup/learningBackup.test.ts`
- Modify: `src/data/sync/SupabaseSyncRemote.test.ts`
- Modify: `src/features/print/PrintPage.tsx`
- Modify: print tests
- Modify: `tests/offline.spec.ts`
- Modify: `tests/print.spec.ts`
- Modify: `tests/pwa.spec.ts`

**Step 1 — RED:** Add legacy-backup import tests and new-backup round-trip tests with `f`-prefixed foundation knowledge/review evidence. The stable item ID is the persisted layer discriminator; no new required backup field is introduced. Add a Supabase serialization test proving the foundation IDs round-trip unchanged. Add print/offline tests that open the foundation route and retain data after reload.

**Step 2 — Verify RED:** Run:

```powershell
pnpm vitest run src/data/backup/learningBackup.test.ts src/data/sync src/features/print
pnpm playwright test tests/offline.spec.ts tests/print.spec.ts tests/pwa.spec.ts
```

Expected: new foundation round-trip/journey cases fail before support.

**Step 3 — GREEN:** Preserve stable foundation IDs through existing schemas and sync payloads, include foundation daily print work, and cache the new route/data through the existing build/PWA mechanism. Do not add a persisted layer field unless a failing compatibility test proves ID-based resolution insufficient; if that occurs, record a plan ruling before changing the interface.

**Step 4 — Verify GREEN:** Re-run Task 7 commands.

Expected: selected unit and browser tests pass.

**Step 5 — Commit:**

```powershell
git add -- src/data src/features/print tests/offline.spec.ts tests/print.spec.ts tests/pwa.spec.ts
git commit -m "feat: preserve foundation learning across backup and offline flows"
```

## Task 8: Full verification, review, and deployment

**Step 1:** Run formatting/diff checks:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; only intended tracked changes before final commits.

**Step 2:** Run the complete release gate:

```powershell
pnpm release:verify
```

Expected: content/audio audits, all unit tests, typecheck, lint, build, bundle budget, Playwright journeys, Pages contract, and migration verification all pass.

**Step 3:** Run production dependency audit:

```powershell
pnpm audit --prod --audit-level moderate
```

Expected: exit 0 with no moderate-or-higher production vulnerability.

**Step 4:** Generate the Superpowers review package, perform the required whole-branch review, grade findings, and fix every Critical/Important finding with a witnessed RED→GREEN regression test and a fresh full suite.

**Step 5:** Commit any verified review fixes, confirm clean status, and push `main` only after integration through the finishing-development-branch workflow.

**Step 6:** Wait for GitHub Pages deployment and run:

```powershell
pnpm site:verify -- https://yangyang753.github.io/cet4-study-pwa/
```

Expected: public shell/assets/manifest/service worker are reachable and the new foundation route loads on phone-sized viewport.

## Review focus

- A legacy `v` word must never be misclassified as foundation and an `f` word must never appear in the core mistake queue.
- Task completion must be evidence from the correct layer, not any vocabulary attempt.
- Correct answers must not create or retain mistake cards; failed retention must demote only the failed target.
- Recall prompts must never hide both target identity and meaning.
- New quota allocation must not exceed the learner's configured daily minutes.
- Old backups and IndexedDB records without layer metadata must remain readable as core data.
- Content audits must catch duplicated/noisy meanings, unknown enrichment references, and insufficient coverage without importing copyrighted material.
- Static GitHub Pages must not claim background push or cloud sync when those services are absent.
