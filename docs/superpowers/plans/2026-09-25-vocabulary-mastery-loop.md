# Vocabulary Mastery Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add adaptive vocabulary workload, old-word cloze review, and a post-warmup passage translation check that feeds misses into review.

**Architecture:** Pure scheduling and assessment modules compute workload, cloze prompts, passage text, and state transitions. A vocabulary-session component orchestrates review → warm-up → translation → existing questions while persisting through the existing repository. Dashboard copy consumes the same workload calculator.

**Tech Stack:** React 19, TypeScript, Dexie, Vitest, Testing Library, Vite PWA.

**Spec:** `docs/superpowers/specs/2026-09-25-vocabulary-mastery-loop.md`

## Global Constraints

- Preserve the current local-first and cloud-sync contracts.
- Keep new `KnowledgeState` fields optional for backup compatibility.
- Reserve 14 days for consolidation; adaptive quota is bounded to 10–20 new words.
- Do not claim guaranteed exam passage; show 425 reference and 450 safety target.
- All behavior changes follow RED-GREEN TDD.

## Review Focus

- An exam date inside the 14-day reserve must still produce a finite quota and no divide-by-zero.
- A learner with all 800 words mastered must receive zero new words.
- Saving a cloze result must not advance when repository persistence fails.
- Translation audit must not mark a word mastered solely because the learner clicked “基本认识”.
- Old backups lacking new optional state fields must continue to import.

---

### Task 1: Adaptive workload and spaced word review domain

**Files:**
- Modify: `src/domain/learning.ts`
- Create: `src/features/vocabulary/vocabularySchedule.ts`
- Test: `src/features/vocabulary/vocabularySchedule.test.ts`
- Modify: `src/data/backup/learningBackup.test.ts`

**Interfaces:**
- Produces: `buildVocabularyWorkload(entries, states, today, examDate)` returning `{ newWords, dueWords, newWordQuota, remainingWords, projectedCompletionDate }`.
- Produces: `buildWordCloze(word, stage)` and `applyVocabularyReviewResult(state, correct, now)`.

- [ ] Write failing tests for quota boundaries, 14-day reserve, all-mastered input, due ordering, cloze difficulty, and state transitions.
- [ ] Run `npm test -- --run src/features/vocabulary/vocabularySchedule.test.ts` and confirm failures are missing exports/behavior.
- [ ] Implement the pure scheduling module and optional state fields.
- [ ] Run the focused tests and confirm they pass.
- [ ] Add a backup compatibility test for old `KnowledgeState` records and run it.
- [ ] Commit with `feat: add adaptive vocabulary review schedule`.

### Task 2: Daily old-word review and passage translation gate

**Files:**
- Create: `src/features/vocabulary/DailyVocabularySession.tsx`
- Create: `src/features/vocabulary/DailyVocabularySession.test.tsx`
- Create: `src/features/vocabulary/buildVocabularyPassage.ts`
- Create: `src/features/vocabulary/buildVocabularyPassage.test.ts`
- Create: `src/features/vocabulary/VocabularyTranslationCheck.tsx`
- Create: `src/features/vocabulary/VocabularyTranslationCheck.test.tsx`
- Modify: `src/features/vocabulary/VocabularyWarmup.tsx`
- Modify: `src/features/practice/ExerciseRunner.tsx`
- Modify: `src/features/practice/practice.css`

**Interfaces:**
- Consumes Task 1 workload, cloze, and state-transition functions.
- Produces: `DailyVocabularySession` calling `onComplete(newWords)` only after due review, warm-up, and passage audit are persisted.
- Produces: `buildVocabularyPassage(words)` returning auditable deterministic segments.

- [ ] Write failing passage tests proving every target word appears and empty input is safe.
- [ ] Run the passage test and confirm RED; implement and confirm GREEN.
- [ ] Write failing component tests for review-first order, correct/incorrect cloze persistence, save retry, translation miss review cards, and completion gating.
- [ ] Run focused component tests and confirm RED.
- [ ] Implement session, cloze review, translation audit, correction control, and integration in `ExerciseRunner`.
- [ ] Run focused tests and confirm GREEN.
- [ ] Commit with `feat: add daily vocabulary mastery session`.

### Task 3: Dashboard visibility and responsive polish

**Files:**
- Modify: `src/features/dashboard/TodayPage.tsx`
- Modify: `src/features/dashboard/TodayPage.test.tsx`
- Modify: `src/features/dashboard/dashboard.css`
- Modify: `src/features/vocabulary/VocabularyWarmup.test.tsx`

**Interfaces:**
- Consumes Task 1 `buildVocabularyWorkload`.
- Produces learner-visible old-review count, adaptive quota, remaining count, projected completion, and 450 safety-target wording.

- [ ] Write failing dashboard tests for workload details, zero remaining words, and safe score wording.
- [ ] Run focused tests and confirm RED.
- [ ] Implement dashboard rendering and mobile styles.
- [ ] Run focused tests and confirm GREEN.
- [ ] Run `npm test -- --run`, `npm run build`, and the existing release verification command from `package.json`.
- [ ] Commit with `feat: surface adaptive vocabulary mastery plan`.

