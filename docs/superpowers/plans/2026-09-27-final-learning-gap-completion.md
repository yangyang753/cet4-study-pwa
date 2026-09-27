# CET-4 Final Learning Gap Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the audited learning-loop gaps while moving first vocabulary exposure earlier enough to reserve a substantial consolidation period before the 2026-12-12 CET-4 exam.

**Architecture:** Keep the existing local-first React/Dexie architecture. Extend the vocabulary workload as the single source of pacing truth, add explicit culture-target review and stronger deterministic translation evidence, persist exam navigation/audio state in the existing exam session record, and inject date-specific material into the existing print packet builder.

**Tech Stack:** React 19, TypeScript, Vitest, Playwright, Dexie, Vite PWA.

**Spec:** User-confirmed requirements in the 2026-09-27 conversation and the preceding audit findings.

## Global Constraints

- The 2026-12-12 exam date remains the default and stays user-editable.
- Mastery is earned and revoked by tests, never by manual marking.
- Mobile and desktop use the same responsive PWA and the same release.
- Existing local records remain readable after schema additions.
- No external cloud account or secret is invented; offline mode must remain truthful when Supabase is unconfigured.

## Review Focus

- A 60-minute beginner plan with 800 unseen words reserves at least 35 days for consolidation without exceeding the 45-item knowledge cap.
- A learned culture target appears in an actual cloze check before translation and cannot be copied from an English hint.
- Semantically empty translations containing target words do not pass.
- Leaving and returning to a listening group, or restoring the exam, cannot replay completed audio.
- A daily A4 packet includes date-specific vocabulary and culture translation with separate answers.

---

### Task 1: Earlier vocabulary first pass

- [ ] Add failing workload tests for a 35-day consolidation reserve and visible deadline metadata.
- [ ] Implement adaptive first-pass deadline and quota calculations.
- [ ] Run vocabulary and dashboard tests.

### Task 2: Honest culture-target learning and grading

- [ ] Add failing component and evaluator tests for culture-word cloze review, hidden English targets, and key-point evidence.
- [ ] Implement the culture-target phase and stronger deterministic evaluation.
- [ ] Run vocabulary and culture-translation tests.

### Task 3: Recoverable one-play mock listening

- [ ] Add failing reducer/component tests for persisted question position and played listening groups.
- [ ] Extend the backward-compatible exam session record and player state flow.
- [ ] Run exam tests.

### Task 4: Date-specific A4 packet

- [ ] Add failing print packet tests for daily vocabulary and culture translation blocks.
- [ ] Add a daily context input and render question/answer space through the existing paginator.
- [ ] Run print tests.

### Task 5: Content and honest runtime guidance

- [ ] Expand culture prompts to cover the remaining preparation window without a 24-day repeat.
- [ ] Preserve the truthful foreground-reminder and offline-sync messaging and add actionable setup links where appropriate.
- [ ] Run content and account/settings tests.

### Task 6: Release

- [ ] Run the full release verification.
- [ ] Review the complete diff for regressions and requirement coverage.
- [ ] Commit and push `main` so GitHub Pages updates the phone and desktop site.
