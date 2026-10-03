# CET-4 Content Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean and prioritize the 800-word library, replace synthetic examples, and close the related high-priority learning-quality gaps.

**Architecture:** Put deterministic cleanup and grading rules in focused TypeScript modules, import a checked-in learner-facing example dataset from the existing licensed source, and enforce quality with content audits. Browser persistence and audio-cache management remain progressive enhancements with safe fallbacks.

**Tech Stack:** TypeScript, React, Vitest, Playwright, Dexie, Workbox/Vite PWA

**Spec:** `docs/superpowers/specs/2026-10-03-content-quality-design.md`

## Global Constraints

- Keep 800 vocabulary entries and preserve their stable IDs and exam-frequency order.
- Do not require network access for study after installation.
- Never mark mastery from a reveal action; only graded recall changes mastery.
- Preserve the existing GitHub Pages URL and mobile layout.

## Review Focus

- Polysemous words whose near-synonyms can be mistaken for separate senses.
- Words whose spelling is a substring of another word in an example.
- Browsers that do not implement the StorageManager persistence API.
- Cached audio created by an older service-worker cache version.
- Listening segments that differ only in punctuation or whitespace.

---

### Task 1: Vocabulary meanings and examples

**Files:**
- Modify: `src/content/vocabularyLearning.ts`
- Modify: `src/content/vocabularyLearning.test.ts`
- Create: `content/v1/vocabulary-examples.json`
- Modify: `scripts/audit-content.mts`

**Interfaces:**
- Produces: cleaned `learningVocabulary` with prioritized `meaningZh`, natural `example`, and aligned `exampleZh`.

- [ ] Add failing tests for atomic deduplication, common-sense ordering, and natural bilingual examples.
- [ ] Import and normalize source-backed CET-4 examples for all available target words.
- [ ] Implement deterministic priority merging and strengthen the content audit.
- [ ] Run focused and full tests, then commit.

### Task 2: Structured recall grading

**Files:**
- Modify: `src/features/vocabulary/strictVocabularyCheck.ts`
- Modify: `src/features/vocabulary/strictVocabularyCheck.test.ts`

**Interfaces:**
- Consumes: cleaned semicolon-separated sense groups from Task 1.
- Produces: distinct-concept grading that accepts reasonable aliases without double-counting synonyms.

- [ ] Add failing tests for synonym grouping and three-sense mastery.
- [ ] Implement group-aware parsing and aliases.
- [ ] Run focused and full tests, then commit.

### Task 3: Listening diversity

**Files:**
- Modify: `content/v1/listeningSets.json`
- Modify: `src/content/questionDiversity.ts`
- Modify: `src/content/questionDiversity.test.ts`

**Interfaces:**
- Produces: topic-specific listening scripts and a normalized duplicate-segment audit.

- [ ] Add a failing cross-set duplicate-cap test.
- [ ] Replace repeated stock segments with set-specific material while preserving question answers.
- [ ] Run content/audio tests and commit.

### Task 4: Durable local data and audio-cache controls

**Files:**
- Create: `src/data/storage/persistentStorage.ts`
- Create: `src/data/storage/persistentStorage.test.ts`
- Modify: `src/features/auth/DataManagement.tsx`
- Modify: `src/features/auth/DataManagement.test.tsx`
- Modify: `src/features/listening/cacheListeningAudio.ts`
- Modify: `src/features/listening/cacheListeningAudio.test.ts`
- Modify: `src/features/listening/ListeningPage.tsx`

**Interfaces:**
- Produces: persistence request/status helpers and cache usage/list/clear helpers.

- [ ] Add failing tests for supported, denied, and unsupported storage APIs and cache cleanup.
- [ ] Implement progressive enhancement and accessible controls.
- [ ] Run focused and full tests, then commit.

### Task 5: Release verification and deployment

**Files:**
- Modify: `content/v1/LICENSE.md` when the example-source attribution changes.

- [ ] Run all content, unit, E2E, type, lint, build, bundle, Pages, migration, runtime, and dependency audits.
- [ ] Review the complete diff against this spec.
- [ ] Commit, push `main`, wait for GitHub Pages, and verify the live site.
