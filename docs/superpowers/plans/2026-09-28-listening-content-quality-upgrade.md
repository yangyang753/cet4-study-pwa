# Listening and Content Quality Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a premium listening workspace and format-faithful original listening, matching, writing, and translation practice.

**Architecture:** Keep the current React/Dexie/PWA data flow and stable content IDs. Improve the presentation at the listening feature boundary and strengthen generated content plus audits at the catalog boundary.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Playwright, Vite PWA, JSON content, Windows SAPI audio generation.

**Spec:** `docs/superpowers/specs/2026-09-28-listening-content-quality-upgrade-design.md`

## Global Constraints

- Preserve current question, listening-set, writing, and translation IDs.
- Preserve IndexedDB version 5 and active exam recovery.
- Keep content labeled as original simulation, never official past-paper text.
- Keep 360 px and 200% text layouts free of horizontal overflow.
- Do not claim cloud sync or background push without external configuration.
- Use TDD for each behavior change.

## Review Focus

- Conversation sets must contain at least two alternating speakers and must not be rendered as a single notice.
- Matching questions in one mock must all reference one coherent ten-paragraph article.
- Existing saved attempts and active exams must resolve stable IDs after content regeneration.
- Audio transcript, segment timing, and generated WAV duration must agree after regeneration.
- Translation and writing references must be complete without overstating automated grading quality.

---

### Task 1: Premium listening workspace

**Files:** `src/features/listening/ListeningPage.tsx`, `src/features/listening/listening.css`, `src/features/listening/ListeningPage.test.tsx`, `tests/app.spec.ts`

**Interfaces:** Consumes existing listening JSON and repository methods; produces unchanged attempt and completion records.

- [ ] Add failing component and browser assertions for mission header, progress summary, player timeline, training-stage hierarchy, sticky question rail, and 360 px layout.
- [ ] Implement the new semantic sections and responsive styling without changing persistence behavior.
- [ ] Run focused tests and commit.

### Task 2: Type-faithful listening and audio

**Files:** `scripts/expand-mock-content.mts`, `scripts/generate-audio.ps1`, `src/content/contentAudit.ts`, related tests, `content/v1/listeningSets.json`, `content/v1/inventory.json`, `public/audio/v1/*.wav`

**Interfaces:** Produces stable listening set/question IDs, speaker-aware segments, synchronized WAV files, and ten questions per set.

- [ ] Add failing audits requiring alternating speakers for conversations and distinct news/passage structures.
- [ ] Generate type-specific transcripts and questions while preserving IDs.
- [ ] Generate and synchronize audio, then run content/audio audits.
- [ ] Commit.

### Task 3: Coherent paragraph matching

**Files:** `scripts/expand-mock-content.mts`, `src/features/exam/examBlueprint.ts`, `src/features/exam/examQuestionFormat.ts`, related tests, `content/v1/readingSets.json`, `content/v1/inventory.json`

**Interfaces:** Produces one ten-paragraph matching group per mock with A–J answers stored as strings.

- [ ] Add failing tests requiring one matching group, ten paragraphs, and ten statements per mock.
- [ ] Generate coherent matching articles and update selection/formatting.
- [ ] Verify all six mocks remain 57 questions with no repeated IDs.
- [ ] Commit.

### Task 4: Complete subjective references

**Files:** `scripts/expand-mock-content.mts`, `src/content/catalog.ts`, `src/content/contentAudit.ts`, related tests, `content/v1/writingPrompts.json`, `content/v1/translations.json`, `content/v1/inventory.json`

**Interfaces:** Writing items expose `referenceAnswer`; translation items retain the existing schema with longer prompts and references.

- [ ] Add failing tests for 120–180 word model essays and at least 80 Chinese characters per translation prompt.
- [ ] Author complete references and update catalog mapping.
- [ ] Run subjective-editor, mock-result, content, and diversity tests.
- [ ] Commit.

### Task 5: Release and deployment

**Files:** Only files exposed by verification failures.

- [ ] Run the complete release verification and production dependency audit.
- [ ] Perform a whole-diff self-review because no subagent reviewer is available.
- [ ] Push `main`, wait for GitHub Pages, and smoke-test the live 390 px listening page and audio.
