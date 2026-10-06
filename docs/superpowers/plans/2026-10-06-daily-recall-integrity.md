# Daily Recall Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair daily mastery and review behavior while improving high-frequency knowledge controls and content quality.

**Architecture:** Extend existing pure selectors/graders first, then connect them to the current React flows and repository. Reuse attempts and knowledge/review records; do not add a database migration.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Dexie, Vite PWA.

**Spec:** `docs/superpowers/specs/2026-10-06-daily-recall-integrity-design.md`

## Global Constraints

- No manual mastery buttons; evidence remains test-driven.
- Only the specific wrong learned word enters review.
- One acquisition day alternates with one consolidation day.
- Existing offline data and saved daily cohorts remain compatible.

## Review Focus

- Failed mastery must not increment daily completion.
- Recent mastery questions must rotate without losing source relevance.
- Multi-target translation must preserve correctly used words.
- Consolidation day must contain no new word or collocation.
- Bulk meaning controls must not break individual reveal behavior.

---

### Task 1: Trustworthy mastery completion and rotating questions

**Files:**
- Modify: `src/features/mastery/taskProgress.ts`
- Modify: `src/features/mastery/MasteryCheck.tsx`
- Test: `src/features/mastery/taskProgress.test.ts`
- Test: `src/features/mastery/MasteryCheck.test.tsx`

**Interfaces:**
- Produces: `selectMasteryQuestions(kind, sourceQuestionIds, recentQuestionIds)` and completion only on mastered outcome.

- [ ] Add failing tests for remediation without completion and recent-question exclusion.
- [ ] Run tests and confirm the intended failures.
- [ ] Implement the minimal state and selection changes.
- [ ] Run focused tests and commit.

### Task 2: Per-target learned-word translation grading

**Files:**
- Modify: `src/features/knowledge/learnedWordTranslation.ts`
- Modify: `src/features/knowledge/KnowledgePage.tsx`
- Test: `src/features/knowledge/learnedWordTranslation.test.ts`
- Test: `src/features/knowledge/KnowledgePage.test.tsx`

**Interfaces:**
- Produces: per-target correctness through `failedWordIds` while retaining sentence feedback.

- [ ] Add failing tests for valid paraphrase, word-salad rejection, and one wrong target in a multi-target answer.
- [ ] Run tests and confirm failures.
- [ ] Implement conservative sentence validation and target-specific failure persistence.
- [ ] Run focused tests and commit.

### Task 3: Bulk vocabulary meaning visibility

**Files:**
- Modify: `src/features/knowledge/KnowledgePage.tsx`
- Modify: `src/features/knowledge/knowledge.css`
- Test: `src/features/knowledge/KnowledgePage.test.tsx`

**Interfaces:**
- Produces: accessible `显示当前全部释义` / `隐藏当前全部释义` control.

- [ ] Add the failing interaction test.
- [ ] Implement the bulk control using the existing reveal set.
- [ ] Verify individual and bulk behavior and commit.

### Task 4: Alternating acquisition and consolidation

**Files:**
- Modify: `src/features/vocabulary/vocabularySchedule.ts`
- Modify: `src/features/collocations/collocationPractice.ts`
- Test: `src/features/vocabulary/vocabularySchedule.test.ts`
- Test: `src/features/collocations/collocationPractice.test.ts`

**Interfaces:**
- Produces: acquisition/consolidation alternation derived from completed vocabulary sessions.

- [ ] Add failing tests for session 0 acquisition, session 1 consolidation, and session 2 acquisition.
- [ ] Implement alternating quota/date calculations for words and collocations.
- [ ] Run focused tests and commit.

### Task 5: CET-focused vocabulary and collocation audit

**Files:**
- Modify: `src/content/vocabularyLearning.ts`
- Modify: `src/content/vocabularyLearning.test.ts`
- Modify: `src/content/contentAudit.ts`
- Test: `src/content/contentAudit.test.ts`

**Interfaces:**
- Produces: corrected common-sense overrides and stricter collocation translation audit.

- [ ] Add failing fixtures for confirmed noisy senses/examples and incomplete collocation translations.
- [ ] Add the minimal curated corrections and audit rules.
- [ ] Run content tests/audits and commit.

### Task 6: End-to-end verification and deployment

**Files:**
- Modify only if verification identifies a regression.

- [ ] Run the full release verification command.
- [ ] Review the complete diff against the spec.
- [ ] Merge to `main`, push to GitHub, and verify the Pages deployment because the user previously requested automatic phone updates.
