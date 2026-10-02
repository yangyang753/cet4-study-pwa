# Vocabulary and Readiness Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the 800-word common-meaning data and close the highest-impact audited learning and readiness gaps.

**Architecture:** A deterministic dictionary importer produces the checked-in meaning subset; runtime code merges it with reviewed corrections. Small UI components add pronunciation and reuse the existing readiness model. Content audit functions enforce mock fidelity without coupling daily practice to full-paper requirements.

**Tech Stack:** TypeScript, React, Vitest, Testing Library, Playwright, Vite, JSON content pipeline.

**Spec:** `docs/superpowers/specs/2026-10-02-vocabulary-and-readiness-completion-design.md`

## Global Constraints

- Preserve offline-first use and existing local learning records.
- Do not expose dictionary source files or external credentials in the production bundle.
- Do not claim cloud sync or closed-page push is active without the required service configuration.
- Use test-first implementation and publish only after the full release verification is green.

## Review Focus

- Browsers without `speechSynthesis` must not crash and must explain the limitation.
- Dictionary labels, line breaks and duplicate senses must not leak into learner-facing meanings.
- Monosemous words must not be padded with invented senses merely to satisfy a count.
- Account rendering with a partial repository stub must not break existing tests.
- Score wording must not imply an official CET score conversion.

---

### Task 1: Source-backed 800-word meanings

**Files:**
- Modify: `scripts/build-vocabulary-common-meanings.mts`
- Modify: `content/v1/vocabulary-common-meanings.json`
- Modify: `src/content/vocabularyLearning.ts`
- Test: `src/content/vocabularyLearning.test.ts`
- Modify: `docs/content-sources.md`

**Interfaces:**
- Produces: a normalized `Record<string, string>` covering all 800 vocabulary headwords.
- Consumes: KyleBing JSONL and ECDICT CSV paths supplied to the build script.

- [ ] Add failing coverage and representative polysemy tests.
- [ ] Run the focused test and observe failure.
- [ ] Implement deterministic CSV/JSONL merge and runtime audit.
- [ ] Regenerate the checked-in subset and run focused/content tests.
- [ ] Commit the task.

### Task 2: Vocabulary pronunciation

**Files:**
- Create: `src/features/vocabulary/PronounceButton.tsx`
- Create: `src/features/vocabulary/PronounceButton.test.tsx`
- Modify: `src/features/vocabulary/VocabularyWarmup.tsx`
- Modify: `src/features/knowledge/KnowledgePage.tsx`
- Modify: `src/features/knowledge/knowledge.css`

**Interfaces:**
- Produces: `PronounceButton({ text }: { text: string })` with graceful unsupported handling.

- [ ] Add failing supported/unsupported browser tests.
- [ ] Run the focused test and observe failure.
- [ ] Implement and integrate pronunciation controls.
- [ ] Run vocabulary and knowledge component tests.
- [ ] Commit the task.

### Task 3: Honest score copy and accessible readiness

**Files:**
- Modify: `src/features/auth/AccountPage.tsx`
- Modify: `src/features/auth/AccountPage.test.tsx`
- Modify: `src/features/diagnostic/DiagnosticPage.tsx`
- Modify: `src/features/diagnostic/DiagnosticPage.test.tsx`
- Modify: `src/features/dashboard/TodayPage.tsx`
- Modify: `src/features/dashboard/TodayPage.test.tsx`
- Modify: `src/features/exam/ExamResult.tsx`
- Modify: `src/features/exam/ExamResult.test.tsx`

**Interfaces:**
- Consumes: existing `ExamReadiness`, settings and repository interfaces.
- Produces: reachable checklist and consistently qualified estimate wording.

- [ ] Add failing page tests for checklist placement and non-definitive score copy.
- [ ] Run focused tests and observe failure.
- [ ] Integrate the checklist and revise score copy.
- [ ] Run affected page tests.
- [ ] Commit the task.

### Task 4: Full-mock fidelity guardrails and release

**Files:**
- Modify: `src/content/contentAudit.ts`
- Modify: `src/content/contentAudit.test.ts`
- Modify: `scripts/expand-mock-content.mts`
- Modify: `content/v1/listeningSets.json`
- Modify: `content/v1/readingSets.json`
- Modify: `content/v1/translations.json`
- Modify: `content/v1/mockExams.json`

**Interfaces:**
- Produces: content-audit errors for undersized full-mock sections and a compliant mock inventory.

- [ ] Add failing official-length and mock-count audit tests.
- [ ] Run focused tests and observe failure.
- [ ] Expand/regenerate full-mock material while retaining original simulated-content labeling.
- [ ] Run all content/audio and app verification commands.
- [ ] Request whole-change review, fix Important/Critical findings once, then push `main`.
