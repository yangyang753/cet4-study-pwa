# Vocabulary Accuracy and Learned-Word Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix false vocabulary failures, strengthen all-800 learner-facing meaning quality, and add short learned-word Chinese-culture Chinese-to-English practice.

**Architecture:** Keep grading and exercise generation in pure tested modules. React coordinates UI and existing repository writes; the existing knowledge/mastery and review-card APIs remain unchanged.

**Tech Stack:** React 19, TypeScript, Vitest/Testing Library, IndexedDB repository abstraction, CSS.

**Spec:** `docs/superpowers/specs/2026-10-05-vocabulary-accuracy-and-translation-design.md`

## Global Constraints

- Correct answers never create review cards or demote a word.
- Translation prompts use learned words only and never reveal target English before submission.
- Learner-facing meanings contain at most four CET-relevant sense groups.
- No new runtime dependency and no unsupported cloud/AI claim.
- Phone and desktop layouts remain usable.

## Review Focus

- A threshold-passing meaning answer with an extra synonym must remain correct.
- A partial multi-word translation must punish only missing targets.
- Fewer than two learned words must disable multi mode without breaking single mode.
- Repository failure must preserve the submitted response and allow retry.
- Reloading the knowledge page must not mislabel a finished review as failed.

---

### Task 1: Meaning-grading source-of-truth fix

**Files:**
- Modify: `src/features/vocabulary/strictVocabularyCheck.test.ts`
- Modify: `src/features/vocabulary/strictVocabularyCheck.ts`
- Modify: `src/features/knowledge/KnowledgePage.test.tsx`
- Modify: `src/features/knowledge/KnowledgePage.tsx`

**Interfaces:**
- Produces: `gradeStrictVocabularyAnswer(...): StrictVocabularyGrade` where threshold success is non-fatal despite `unexpectedMeanings`.

- [ ] Add a failing regression for `give` with three accepted meanings plus extra text and a page test proving no review card is written.
- [ ] Run targeted tests and confirm the expected false-negative.
- [ ] Make threshold/spelling the sole correctness condition and only enqueue failed dimensions.
- [ ] Run targeted and vocabulary test suites; commit.

### Task 2: CET-focused 800-word meaning audit

**Files:**
- Modify: `src/content/vocabularyLearning.test.ts`
- Modify: `src/content/vocabularyLearning.ts`
- Modify if required: `content/v1/vocabulary-common-meanings.json`

**Interfaces:**
- Produces: `learningVocabulary` with prioritized, deduplicated meanings and `auditLearningVocabulary()` enforcing quality.

- [ ] Add failing representative tests for high-risk common words and forbidden specialist/rare noise across all 800 entries.
- [ ] Run the content test and confirm failures identify real learner-facing output.
- [ ] Extend reviewed priorities and normalization minimally; strengthen the audit.
- [ ] Run content tests and `pnpm content:audit`; commit.

### Task 3: Learned-word short translation engine

**Files:**
- Create: `src/features/knowledge/learnedWordTranslation.ts`
- Create: `src/features/knowledge/learnedWordTranslation.test.ts`

**Interfaces:**
- Produces: `buildLearnedWordTranslation(words, mode, random)` and `gradeLearnedWordTranslation(exercise, answer)`.

- [ ] Add failing pure-function tests for one/multi mode, Chinese-culture prompts, hidden target metadata, accepted forms, and partial misses.
- [ ] Run tests and confirm missing-module failure.
- [ ] Implement deterministic prompt selection and auditable grading.
- [ ] Run tests; commit.

### Task 4: Translation panel and persistence

**Files:**
- Create: `src/features/knowledge/LearnedWordTranslationPanel.tsx`
- Create: `src/features/knowledge/LearnedWordTranslationPanel.test.tsx`
- Modify: `src/features/knowledge/KnowledgePage.tsx`
- Modify: `src/features/knowledge/KnowledgePage.test.tsx`
- Modify: `src/features/knowledge/knowledge.css`

**Interfaces:**
- Consumes: Task 3 translation builders/graders and existing repository/mastery APIs.

- [ ] Add failing component/page tests for modes, no-target state, pass, partial fail, exact review-card writes, and save retry.
- [ ] Run targeted tests and confirm expected failures.
- [ ] Implement the panel, persistence callbacks, responsive styles, and accessible status text.
- [ ] Run targeted tests and browser-level smoke coverage; commit.

### Task 5: Release verification and deployment

**Files:**
- Modify if required by a failing check: tests nearest the defect and corresponding production file, with RED→GREEN evidence.

**Interfaces:**
- Consumes: Tasks 1–4; produces a verified deployable branch.

- [ ] Run content validation/audit, all unit tests, typecheck, lint, build, and relevant Playwright tests.
- [ ] Review the whole diff against the spec and fix Critical/Important findings with tests.
- [ ] Merge to `main`, rerun verification on merged main, push `origin/main`, and verify the GitHub Pages workflow/live site.
