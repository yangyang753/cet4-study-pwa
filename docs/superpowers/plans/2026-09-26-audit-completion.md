# Audit Completion Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the audited correctness and learning-loop gaps in the CET-4 PWA and deploy the verified result.

**Architecture:** Keep learning rules in pure functions with focused tests, then connect them to existing React views and Dexie repositories. Preserve offline-first behavior and make unavailable cloud capabilities explicit.

**Tech Stack:** React 19, TypeScript, Dexie, Vitest, Testing Library, Playwright, Vite PWA, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-26-audit-completion-design.md`

**Constraints:** No fake cloud-sync status, no negative time allocations, no manual vocabulary mastery controls, no official-score claims, and no loss of existing local data fields.

**Review focus:** State transition integrity, idempotent persistence, mobile accessibility, truthful copy, and backward-compatible settings normalization.

### Task 1: Make time and vocabulary workload allocation safe

- [ ] Add failing boundary tests for daily minute budgets and review backlog.
- [ ] Implement non-negative budget allocation and adaptive new-word quota.
- [ ] Show due/backlog and honest first-exposure projection in the UI.
- [ ] Run focused tests and commit.

### Task 2: Close the translation-to-review loop

- [ ] Add failing tests for preserving knowledge fields and creating cloze cards.
- [ ] Reuse the vocabulary mastery state machine in the translation gate.
- [ ] Strengthen the minimum Chinese-translation completeness check.
- [ ] Run focused tests and commit.

### Task 3: Improve exam readiness and daily guidance

- [ ] Add failing tests for registration deadline, payment, and local-time greeting.
- [ ] Extend normalized settings and readiness UI.
- [ ] Add app-open catch-up guidance while documenting notification limits.
- [ ] Run focused tests and commit.

### Task 4: Make listening evidence and mock readiness trustworthy

- [ ] Add failing tests for per-question timing/idempotent retry and score confidence.
- [ ] Reset listening timing per question and retain attempt ids across retries.
- [ ] Add recent-mock history and a three-mock readiness band.
- [ ] Run focused tests and commit.

### Task 5: Improve vocabulary context quality

- [ ] Add failing diversity/content-audit tests.
- [ ] Replace the small repeated template set with deterministic topic/POS variants.
- [ ] Label generated contexts honestly and run content audit.
- [ ] Commit.

### Task 6: Harden backup, sync status, and release tooling

- [ ] Add tests for backup freshness and offline capability messaging.
- [ ] Record/display successful export time and stale-backup reminders.
- [ ] Ignore isolated worktrees and execution ledgers in lint.
- [ ] Run full release verification, review the diff, merge to main, push, and verify GitHub Pages.

