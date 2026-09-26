# Mastery and Review Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make vocabulary, collocation, grammar, writing, and translation mastery evidence-based, reversible, correctly reviewable, and safely portable across devices.

**Architecture:** Introduce one pure mastery-state transition API shared by knowledge items and review cards. Extend content metadata and repository queries so UI views consume explicit categories rather than inferring them from question shapes. Keep all evaluation deterministic and offline-first, with truthful limitations.

**Tech Stack:** React 19, TypeScript, Dexie, Zod, Vitest, Testing Library, Playwright, Vite PWA.

**Spec:** `docs/superpowers/specs/2026-09-26-mastery-review-completion-design.md`

## Global Constraints

- No manual controls may set vocabulary, collocation, or grammar status to mastered.
- A wrong later review always demotes the item and schedules immediate relearning.
- Existing IndexedDB records and older backups remain readable.
- Offline mode and non-official scoring limitations stay explicit.
- Mobile layout must work at 360 CSS pixels.

## Review Focus

- A first correct answer must not create stable mastery; tests cover promotion thresholds.
- A mastered item answered incorrectly must become review and reappear immediately.
- Future-scheduled mastered cards must remain visible only in the mastered history filter, not today's queue.
- Imported operations from another device/account must not be replayed.
- Subjective review submission must persist one attempt and update the card exactly once.

---

### Task 1: Unify evidence-based mastery transitions

**Files:**
- Modify: `src/domain/learning.ts`
- Modify: `src/features/vocabulary/vocabularySchedule.ts`
- Modify: `src/features/vocabulary/wordMastery.ts`
- Create: `src/features/mastery/knowledgeMastery.ts`
- Test: matching `*.test.ts` files

**Interfaces:**
- Produces: `applyKnowledgeReviewResult(current, itemId, correct, now)` and stable mastery thresholds used by later tasks.

- [ ] Write failing tests for first success, repeated success, and mastered-item failure.
- [ ] Run focused tests and verify expected failures.
- [ ] Implement the shared transition and migrate vocabulary helpers.
- [ ] Run focused tests and the full unit suite.
- [ ] Commit.

### Task 2: Add collocations to daily learning and automatic testing

**Files:**
- Modify: `src/content/catalog.ts`
- Create: `src/features/collocations/collocationPractice.ts`
- Create: `src/features/collocations/CollocationCheck.tsx`
- Modify: `src/features/vocabulary/VocabularyPracticePage.tsx`
- Modify: `src/features/knowledge/KnowledgePage.tsx`
- Modify: styles and focused tests

**Interfaces:**
- Consumes: Task 1 mastery transition.
- Produces: collocation questions, review cards, status-separated knowledge views.

- [ ] Write failing tests for collocation generation, automatic mastery, demotion, and separate filters.
- [ ] Run focused tests and verify expected failures.
- [ ] Implement collocation learning/testing and remove manual mastery controls.
- [ ] Run focused tests and the full unit suite.
- [ ] Commit.

### Task 3: Complete review history and every review category

**Files:**
- Modify: `src/data/repositories/LearningRepository.ts`
- Modify: `src/data/repositories/DexieLearningRepository.ts`
- Modify: `src/features/review/ReviewPage.tsx`
- Modify: `src/content/catalog.ts`
- Test: repository and review-page tests

**Interfaces:**
- Consumes: Task 1 transitions and Task 2 collocation metadata.
- Produces: `listAllReviews()` and objective/subjective review flows.

- [ ] Write failing tests for future mastered history, all category labels, and subjective resubmission.
- [ ] Run focused tests and verify expected failures.
- [ ] Add repository query, explicit knowledge categories, and subjective review UI.
- [ ] Run focused tests and the full unit suite.
- [ ] Commit.

### Task 4: Make backup and sync ownership safe

**Files:**
- Modify: `src/data/backup/learningBackup.ts`
- Modify: `src/data/backup/learningBackup.test.ts`
- Modify: `src/data/sync/SyncEngine.ts`
- Modify: sync tests and account copy as needed

**Interfaces:**
- Produces: complete readiness round-trip and queue-free portable imports.

- [ ] Write failing tests for payment round-trip and imported queue suppression.
- [ ] Run tests and verify expected failures.
- [ ] Preserve readiness fields and stop replaying source sync queues.
- [ ] Add ownership guards for unowned local operations without weakening existing account protection.
- [ ] Run focused tests and full unit suite.
- [ ] Commit.

### Task 5: Strengthen evaluation and mastery-readiness forecasting

**Files:**
- Modify: `src/features/translation/evaluateTranslation.ts`
- Modify: `src/features/composition/evaluateSubjective.ts`
- Modify: `src/features/vocabulary/vocabularySchedule.ts`
- Modify: dashboard UI and tests

**Interfaces:**
- Produces: coverage-aware deterministic feedback and stable-mastery workload fields.

- [ ] Write failing tests for keyword-stuffing, valid aliases, weak sentence structure, and remaining review stages.
- [ ] Run focused tests and verify expected failures.
- [ ] Implement stronger offline rubrics and mastery forecast.
- [ ] Display truthful first-exposure and stable-mastery projections.
- [ ] Run focused tests and full unit suite.
- [ ] Commit.

### Task 6: Release verification and deployment

**Files:**
- Modify: Playwright tests and documentation only if required by changed user-visible behavior.

**Interfaces:**
- Consumes: all previous tasks.

- [ ] Add/adjust mobile end-to-end coverage for automatic collocation mastery and review demotion.
- [ ] Run `pnpm release:verify` and inspect every result.
- [ ] Perform final diff review; fix Important findings through RED→GREEN tests.
- [ ] Merge to main, push to GitHub, and verify the deployed GitHub Pages URL.

