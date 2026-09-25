# Vocabulary-first training implementation plan

**Spec:** `docs/superpowers/specs/2026-09-25-vocabulary-first-translation-gate-design.md`

**Goal:** Add a vocabulary-first daily flow, deterministic pre-answer translation checks, and a persistent review-word view without changing mock or diagnostic behavior.

**Architecture:** Keep vocabulary evidence in the existing `KnowledgeState` store. Add pure selection and lexical-evaluation modules, then thin React components for the warm-up and translation gate. Integrate the gate only at ordinary practice/listening/review boundaries.

**Tech stack:** React 19, TypeScript, Vitest, Testing Library, Dexie repository, Vite PWA.

## Global constraints

- Follow test-driven development: each behavior test must fail for the expected missing behavior before implementation.
- Preserve existing favorite flags when updating word status.
- Do not claim full-sentence translation accuracy.
- Do not add translation gates to diagnostic or mock exam flows.
- Use `apply_patch` for edits.

## Task 1: Pure vocabulary selection and translation evaluation

**Files:**
- Create: `src/features/vocabulary/selectWarmupWords.ts`
- Create: `src/features/vocabulary/selectWarmupWords.test.ts`
- Create: `src/features/translation/evaluateTranslation.ts`
- Create: `src/features/translation/evaluateTranslation.test.ts`

**Steps:**
1. Write failing tests proving review words come first, mastered words come last, and the selector returns ten unique entries.
2. Run the targeted tests and confirm failure because the modules do not exist.
3. Implement the smallest selector.
4. Write failing evaluator tests for exact English token matching, POS-label cleanup, segment-local Chinese coverage, short/noisy meanings, and no-auditable-word behavior.
5. Run and confirm the expected missing-module/behavior failures.
6. Implement the pure evaluator and rerun both files.
7. Commit: `feat: add vocabulary learning evaluators`.

## Task 2: Vocabulary warm-up and daily entry

**Files:**
- Create: `src/features/vocabulary/VocabularyWarmup.tsx`
- Create: `src/features/vocabulary/VocabularyWarmup.test.tsx`
- Modify: `src/features/practice/ExerciseRunner.tsx`
- Modify: `src/features/dashboard/TodayPage.tsx`
- Modify: `src/features/dashboard/TodayPage.test.tsx`
- Modify: `src/features/practice/practice.css`

**Steps:**
1. Write failing component tests showing English-first cards, reveal, persisted `review`/`learning`, favorite preservation, storage retry, and transition after ten decisions.
2. Write a failing Today-page test that the primary action points to vocabulary practice and explains the vocabulary-first sequence.
3. Run targeted tests and confirm the missing behavior.
4. Implement the warm-up and insert it before objective vocabulary questions in practice mode only.
5. Update the Today-page primary action and copy.
6. Rerun targeted tests and commit: `feat: start daily training with vocabulary`.

## Task 3: Translation gate for ordinary objective practice

**Files:**
- Create: `src/features/translation/QuestionTranslationGate.tsx`
- Create: `src/features/translation/QuestionTranslationGate.test.tsx`
- Modify: `src/features/practice/ExerciseRunner.tsx`
- Modify: `src/features/practice/ExerciseRunner.test.tsx`
- Modify: `src/features/practice/practice.css`

**Steps:**
1. Write failing tests for required segment fields, locked radios, missed-word persistence, favorite preservation, successful unlock, and retry after storage failure.
2. Run tests and confirm failures reflect the missing gate.
3. Implement the gate and practice integration. Reset it by question ID.
4. Verify exam-mode practice still renders answer controls directly.
5. Run targeted tests and commit: `feat: require translation before practice answers`.

## Task 4: Listening and review integration

**Files:**
- Modify: `src/features/listening/ListeningPage.tsx`
- Modify: `src/features/listening/ListeningPage.test.tsx`
- Modify: `src/features/review/ReviewPage.tsx`
- Modify: `src/features/review/ReviewPage.test.tsx`

**Steps:**
1. Write failing tests showing listening and queued review radios remain locked until translations are checked.
2. Run tests and confirm the expected failures.
3. Reuse `QuestionTranslationGate`; adapt listening questions to the shared objective shape without changing audio behavior.
4. Reset gate state on next listening question and on returning to/opening a review item.
5. Run targeted tests and commit: `feat: add translation checks to listening and review`.

## Task 5: Visible “待掌握单词” library

**Files:**
- Modify: `src/features/knowledge/KnowledgePage.tsx`
- Modify: `src/features/knowledge/KnowledgePage.test.tsx`
- Modify: `src/features/knowledge/knowledge.css`

**Steps:**
1. Write failing tests for restored review statuses, the “只看待掌握” filter, badges, and moving a review word to mastered.
2. Run and confirm expected failures.
3. Replace the mastered-only set with a status map and implement the filter/badges.
4. Run targeted tests and commit: `feat: surface words that need mastery`.

## Task 6: Integration verification and deployment

**Files:**
- Modify if needed: `tests/*.spec.ts`
- Modify: `docs/superpowers/progress/2026-09-25-vocabulary-first-translation-gate.md`

**Steps:**
1. Add or update an end-to-end path for vocabulary warm-up, translation unlock, and knowledge review filtering; watch it fail before any compatibility fix.
2. Run the complete unit suite, E2E suite, type check, lint, build, audits, and `pnpm release:verify`.
3. Perform a whole-branch self-review because no subagent tool is available; fix any Important/Critical finding with RED→GREEN evidence.
4. Use the finishing-development-branch workflow, fast-forward into `main`, rerun verification, and push `main`.
5. Confirm the GitHub Pages action succeeds and smoke-test the live mobile URL.

## Review focus

- Translation inputs must not be lost across save failures.
- Existing `favorite` flags must survive `review`/`learning`/`mastered` updates.
- Vocabulary data cleanup must not create false misses from one-character or POS-label fragments.
- Warm-up must not appear in mock mode or trap subjective routes.
- Listening question transitions must reset translation state.
- Knowledge filtering must update immediately after state changes.
