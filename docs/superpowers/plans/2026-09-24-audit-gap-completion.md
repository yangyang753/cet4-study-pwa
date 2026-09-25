# CET-4 Audit Gap Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the audited CET-4 learning-quality gaps and deploy the verified result.

**Architecture:** Preserve React, Dexie, PWA, and catalog boundaries. Add focused pure evaluators and UI components, extend settings compatibly, strengthen release audits, and keep unavailable cloud capability explicit.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Dexie, Vite PWA, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-24-audit-gap-completion-design.md`

## Global Constraints

- Preserve offline-first behavior and GitHub Pages hosting.
- Do not claim that original simulations are official historical papers.
- Do not claim guaranteed closed-app notifications.
- Keep cloud sync disabled unless runtime Supabase configuration is real.

## Review Focus

- A 119-word writing response remains incomplete while 120 words passes.
- Subjective mastery never falls back to grammar multiple-choice questions.
- Notification denial leaves settings and study flows usable.
- Existing settings without `reminderTime` normalize safely.
- Placeholder example templates fail the content audit.

---

### Task 1: Official writing requirement

**Files:** `src/features/composition/validateSubjectiveSubmission.*`, `SubjectiveEditor.*`, `evaluateSubjective.*`, `ExerciseRunner.test.tsx`

- [x] Write tests requiring 120 words and updated copy.
- [x] Run tests and confirm the 80-word behavior fails them.
- [x] Change the validation, feedback, and UI copy to 120–180 words.
- [x] Run focused and related tests.
- [x] Commit the task.

### Task 2: Aligned subjective mastery

**Files:** `src/features/mastery/SubjectiveMasteryCheck.*`, `MasteryCheck.*`, `mastery.css`

- [x] Write tests for writing and translation evidence, the 80% threshold, and repository records.
- [x] Run tests and confirm the subjective component is missing.
- [x] Implement the pure evaluator and component, then route writing/translation mastery to it.
- [x] Run focused and related tests.
- [x] Commit the task.

### Task 3: Honest, useful learning content

**Files:** `scripts/generate-content.mts`, `src/content/contentAudit.*`, `scripts/audit-content.mts`, `content/v1/*.json`, `KnowledgePage.*`

- [x] Write audits and UI tests rejecting placeholder examples and requiring provenance copy.
- [x] Run tests and confirm current generated content fails.
- [x] Generate contextual English examples with Chinese memory cues and clarify provenance in the UI.
- [x] Regenerate inventory and run content validation/audits.
- [x] Commit the task.

### Task 4: Listening transparency and multi-voice generation

**Files:** `scripts/generate-audio.ps1`, `ListeningPage.*`

- [x] Write a UI test for the synthetic-audio notice.
- [x] Run it and confirm failure.
- [x] Add the notice and update generation to discover and rotate installed English voices with fallback.
- [x] Run listening tests and audio audit.
- [x] Commit the task.

### Task 5: Daily reminder

**Files:** `src/domain/learning.*`, `LearningSettings.*`, `src/components/StudyReminder.*`, `AppShell.*`

- [x] Write tests for normalization, saving reminder time, due checks, duplicate suppression, and denied permission.
- [x] Run tests and confirm missing behavior.
- [x] Implement optional reminders and truthful browser limitations.
- [x] Run focused and full unit tests.
- [x] Commit the task.

### Task 6: Release and deployment

**Files:** release artifacts and documentation only as needed.

- [x] Run complete release verification and production dependency audit.
- [x] Review the entire branch against the spec and fix important findings test-first.
- [ ] Merge to `main`, push GitHub, wait for Pages deployment, and verify the live app and one audio asset return HTTP 200.
