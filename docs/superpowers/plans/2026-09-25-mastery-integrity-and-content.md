# Mastery Integrity and Content Completion Plan

> Execution mode: inline, test-driven, no confirmation gates per user request.

**Goal:** Make vocabulary mastery fully evidence-driven, reversible after review failures, visually separated by status, and supported by complete daily content and realistic scheduling.

**Architecture:** Centralize vocabulary state transitions in a small domain module used by translation, objective practice, and review. Extend review cards with an optional cloze format. Keep persistence backward compatible and derive KnowledgePage groups from repository state.

## Task 1: Central vocabulary mastery state machine

**Files:** `src/features/vocabulary/wordMastery.ts`, its tests, translation session, practice runner.

- Write failing tests for translation-only learning, objective promotion, and failure demotion.
- Implement pure state transitions and review-card helpers.
- Route translation and vocabulary question outcomes through them.

## Task 2: Cloze review and separated knowledge views

**Files:** domain types, ReviewPage, KnowledgePage and tests/styles.

- Write failing tests for cloze review grading and mastered-word demotion.
- Extend ReviewCard compatibly and render cloze cards.
- Remove vocabulary manual mastery controls.
- Add mutually exclusive unlearned, learning/review, and mastered views with counts.

## Task 3: Complete, useful vocabulary content

**Files:** vocabulary loader, passage builder, translation check and tests.

- Write failing tests requiring usable examples for the full library.
- Replace generic fallback text with part-of-speech/topic-aware contextual examples.
- Split translation into small passages while covering every daily word.

## Task 4: Adaptive time and deadline risk

**Files:** vocabulary schedule, day planner, TodayPage and tests.

- Write failing tests for workload time estimation and projected completion risk.
- Allocate vocabulary minutes dynamically while preserving the daily total.
- Surface risk and minimum daily pace honestly on the dashboard.
- Improve local-only sync/status guidance without pretending cloud sync exists.

## Task 5: Release verification

- Run focused tests after each task.
- Run the full test suite, production build, and browser E2E suite.
- Review the diff, commit, merge to `main`, push GitHub, and verify Pages deployment.
