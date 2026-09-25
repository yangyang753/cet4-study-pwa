# CET-4 Learning Quality Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the audited learning-loop, content-quality, translation, persistence, and synchronization-clarity gaps in the CET-4 PWA.

**Architecture:** Add a vocabulary-learning adapter used by every learner-facing vocabulary consumer. Pass warm-up entries into deterministic question generation, extend the pure translation evaluator, and add explicit retry state to UI persistence boundaries. Keep synchronization local-first and credentials external.

**Tech Stack:** React 19, TypeScript 6, Vitest, Testing Library, Playwright, Dexie, Vite PWA.

**Spec:** `docs/superpowers/specs/2026-09-25-learning-quality-completion-design.md`

## Global Constraints

- Support desktop and 360 px mobile browsers.
- Keep ordinary study fully usable offline.
- Do not add teaching gates to mock exams.
- Do not add secrets, service-role keys, unlicensed datasets, or official-paper copies.
- Preserve existing favorites and learner input on every retry path.

## Review Focus

- A review-priority warm-up word must produce the same question ID and not a random vocabulary question.
- Irregular or over-aggressive stemming must never map a token when no resulting headword exists.
- A one-character valid Chinese translation must pass while Latin-only filler must fail.
- A failed write followed by retry must create one logical attempt/result, not duplicate progress.
- Local-mode copy must not imply phone/computer learning records synchronize automatically.

---

### Task 1: Learner-facing vocabulary quality adapter

**Files:**
- Create: `src/content/vocabularyLearning.ts`
- Create: `src/content/vocabularyLearning.test.ts`
- Modify: `src/content/catalog.ts`
- Modify: `src/content/contentAudit.ts`
- Modify: `src/content/contentAudit.test.ts`
- Modify: learner-facing vocabulary imports in warm-up, knowledge, translation, and print modules

**Interfaces:**
- Produces: `learningVocabulary: VocabularyEntry[]`, `qualityVocabularyEntry(entry): VocabularyEntry`, `auditLearningVocabulary(entries): string[]`.
- Consumed by: Tasks 2 and 3.

- [ ] Write tests proving `passage` includes “文章/段落”, `long` uses the adjective/adverb duration sense, reviewed natural examples survive, and meta-definition examples are hidden.
- [ ] Run `pnpm test --run src/content/vocabularyLearning.test.ts src/content/contentAudit.test.ts`; expect failures because the adapter does not exist.
- [ ] Implement the correction map, example suppression, shared export, and audit integration.
- [ ] Switch all learner-facing consumers to `learningVocabulary`.
- [ ] Re-run the targeted tests; expect pass.
- [ ] Commit with `feat: improve learner-facing vocabulary quality`.

### Task 2: Bind warm-up words to assessment questions

**Files:**
- Create: `src/features/vocabulary/buildWarmupQuestions.ts`
- Create: `src/features/vocabulary/buildWarmupQuestions.test.ts`
- Modify: `src/features/vocabulary/VocabularyWarmup.tsx`
- Modify: `src/features/vocabulary/VocabularyWarmup.test.tsx`
- Modify: `src/features/practice/ExerciseRunner.tsx`
- Modify: `src/features/practice/ExerciseRunner.test.tsx`
- Modify: `tests/app.spec.ts`

**Interfaces:**
- Consumes: Task 1 `learningVocabulary`.
- Produces: `buildWarmupQuestions(entries, vocabulary): ObjectiveQuestion[]`; warm-up callback `(entries: VocabularyEntry[]) => void`.

- [ ] Write tests proving the callback returns all displayed entries and the resulting question IDs exactly match those entries in order.
- [ ] Run targeted tests; expect failures from the old void callback and independently selected questions.
- [ ] Implement deterministic four-option meaning questions and replace vocabulary practice questions after warm-up.
- [ ] Update the browser journey to assert the first question is the first warmed word.
- [ ] Run vocabulary/practice tests; expect pass.
- [ ] Commit with `feat: assess the exact words learned in warmup`.

### Task 3: Improve translation coverage and validation

**Files:**
- Modify: `src/features/translation/evaluateTranslation.ts`
- Modify: `src/features/translation/evaluateTranslation.test.ts`
- Modify: `src/features/translation/QuestionTranslationGate.tsx`
- Modify: `src/features/translation/QuestionTranslationGate.test.tsx`

**Interfaces:**
- Consumes: Task 1 `learningVocabulary`.
- Produces: `TranslationEvaluation` with `coveredWords`; `resolveVocabularyToken(token, vocabulary)`.

- [ ] Write pure tests for exact match, plurals, `-ies`, `-ed`, `-ing`, no false stem, and Chinese-character completeness.
- [ ] Write component test for visible coverage counts and preserved missed-word persistence.
- [ ] Run targeted tests; expect failures under exact-only/nonempty-only behavior.
- [ ] Implement candidate resolution, Chinese validation, coverage output, and UI copy.
- [ ] Run targeted tests; expect pass.
- [ ] Commit with `feat: improve translation vocabulary coverage`.

### Task 4: Recover all critical learning saves

**Files:**
- Modify: `src/features/mastery/MasteryCheck.tsx`
- Modify: `src/features/mastery/MasteryCheck.test.tsx`
- Modify: `src/features/review/ReviewPage.tsx`
- Modify: `src/features/review/ReviewPage.test.tsx`
- Modify: `src/features/knowledge/KnowledgePage.tsx`
- Modify: `src/features/knowledge/KnowledgePage.test.tsx`

**Interfaces:**
- Consumes: existing `LearningRepository` methods.
- Produces: retryable mastery/review submissions and rollback-safe knowledge updates.

- [ ] Add tests that reject the first persistence attempt, retain input/state, display an alert, then succeed exactly once on retry.
- [ ] Run targeted tests; expect failed assertions or stuck saving state.
- [ ] Add guarded try/catch/finally state machines and knowledge rollback.
- [ ] Run targeted tests; expect pass.
- [ ] Commit with `fix: recover failed learning progress saves`.

### Task 5: Clarify local versus cloud synchronization

**Files:**
- Modify: `src/features/auth/AccountPage.tsx`
- Modify: `src/features/auth/DataManagement.tsx`
- Modify: `src/features/auth/DataManagement.test.tsx`
- Modify: `src/features/auth/auth.css`
- Modify: `README.md`

**Interfaces:**
- Consumes: existing `cloudConfigured` and JSON backup actions.
- Produces: accurate local-mode guidance and direct backup controls; no credential mutation.

- [ ] Add component tests proving local mode says records do not automatically sync and exposes export/import, while cloud mode does not show that warning.
- [ ] Run targeted tests; expect failure because current copy implies automatic sync.
- [ ] Implement concise mode-specific guidance and document the external credential boundary.
- [ ] Run targeted tests; expect pass.
- [ ] Commit with `docs: clarify cross-device synchronization modes`.

### Task 6: Full verification and deployment readiness

**Files:**
- Modify: `docs/superpowers/progress/2026-09-25-learning-quality-completion.md`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: release evidence and deployment handoff.

- [ ] Run `pnpm release:verify`; expect all content, audio, unit, browser, type, lint, build, PWA, Pages, migration, and runtime checks to pass.
- [ ] Run `pnpm audit --prod`; expect no known vulnerabilities.
- [ ] Review the complete branch against the spec, with special attention to retry duplication and warm-up/question identity.
- [ ] Record results and commit with `docs: record learning quality verification`.

