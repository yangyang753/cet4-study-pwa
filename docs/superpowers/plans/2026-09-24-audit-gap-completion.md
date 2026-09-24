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

- [ ] Write tests requiring 120 words and updated copy.
- [ ] Run tests and confirm the 80-word behavior fails them.
- [ ] Change the validation, feedback, and UI copy to 120–180 words.
- [ ] Run focused and related tests.
- [ ] Commit the task.

### Task 2: Aligned subjective mastery

**Files:** `src/features/mastery/SubjectiveMasteryCheck.*`, `MasteryCheck.*`, `mastery.css`

- [ ] Write tests for writing and translation evidence, the 80% threshold, and repository records.
- [ ] Run tests and confirm the subjective component is missing.
- [ ] Implement the pure evaluator and component, then route writing/translation mastery to it.
- [ ] Run focused and related tests.
- [ ] Commit the task.

### Task 3: Honest, useful learning content

**Files:** `scripts/generate-content.mts`, `src/content/contentAudit.*`, `scripts/audit-content.mts`, `content/v1/*.json`, `KnowledgePage.*`

- [ ] Write audits and UI tests rejecting placeholder examples and requiring provenance copy.
- [ ] Run tests and confirm current generated content fails.
- [ ] Generate contextual English examples with Chinese memory cues and clarify provenance in the UI.
- [ ] Regenerate inventory and run content validation/audits.
- [ ] Commit the task.

### Task 4: Listening transparency and multi-voice generation

**Files:** `scripts/generate-audio.ps1`, `ListeningPage.*`

- [ ] Write a UI test for the synthetic-audio notice.
- [ ] Run it and confirm failure.
- [ ] Add the notice and update generation to discover and rotate installed English voices with fallback.
- [ ] Run listening tests and audio audit.
- [ ] Commit the task.

### Task 5: Daily reminder

**Files:** `src/domain/learning.*`, `LearningSettings.*`, `src/components/StudyReminder.*`, `AppShell.*`

- [ ] Write tests for normalization, saving reminder time, due checks, duplicate suppression, and denied permission.
- [ ] Run tests and confirm missing behavior.
- [ ] Implement optional reminders and truthful browser limitations.
- [ ] Run focused and full unit tests.
- [ ] Commit the task.

### Task 6: Release and deployment

**Files:** release artifacts and documentation only as needed.

- [ ] Run complete release verification and production dependency audit.
- [ ] Review the entire branch against the spec and fix important findings test-first.
- [ ] Merge to `main`, push GitHub, wait for Pages deployment, and verify the live app and one audio asset return HTTP 200.

