# Tolerant Vocabulary and Content Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Chinese meaning recall tolerant to equivalent wording and a three-core-sense threshold, clean corrupted CET-4 vocabulary content, and add safe per-set listening downloads and bounded deployment checks.

**Architecture:** Centralize Chinese sense parsing and equivalence scoring in `strictVocabularyCheck.ts` so every vocabulary workflow consumes the same grade. Keep curated vocabulary corrections at the runtime quality boundary and strengthen audits against source corruption. Add a focused browser cache helper used by ListeningPage, and bound deployment verification with abortable Range requests.

**Tech Stack:** React 19, TypeScript 6, Vitest, Playwright, Dexie, Workbox/Vite PWA, PowerShell content generation.

**Spec:** `docs/superpowers/specs/2026-10-03-tolerant-vocabulary-and-content-quality-design.md`

## Global Constraints

- Meaning recall passes after `min(3, coreSenseCount)` equivalent concepts are recognized.
- Spelling and English cloze answers remain exact apart from case and surrounding whitespace.
- All vocabulary recall surfaces use the same grader.
- No silent full-library audio download and no claim of real background push or cloud sync without external services.
- Product code changes follow RED→GREEN TDD.

## Review Focus

- A two-sense word requires both senses; a many-sense word requires only three distinct matched concepts.
- Synonym matching must not accept an unrelated phrase merely because one Chinese character overlaps.
- Technical dictionary noise must not return through regenerated content.
- Audio caching must not report success before the cache write finishes and must explain quota/network failure.
- Deployment probing must abort predictably and must not download the full WAV body.

---

### Task 1: Tolerant core-sense grading

**Files:**
- Modify: `src/features/vocabulary/strictVocabularyCheck.ts`
- Modify: `src/features/vocabulary/strictVocabularyCheck.test.ts`
- Modify: `src/features/knowledge/wordReinforcement.test.ts`
- Modify: `src/features/vocabulary/VocabularyRecallExercise.test.tsx`
- Modify: `src/features/vocabulary/StrictVocabularyCheckView.tsx`
- Modify: `src/features/knowledge/KnowledgePage.tsx`
- Modify: `src/features/review/ReviewPage.tsx`

**Interfaces:**
- Produces: `gradeStrictVocabularyAnswer(...) -> StrictVocabularyGrade` with `matchedMeaningCount`, `requiredMeaningCount`, `recognizedMeanings`, and `remainingMeanings`.
- Consumes: existing `VocabularyEntry.meaningZh` strings.

- [ ] Write failing tests for synonym acceptance, three-sense threshold, two-sense completeness, unrelated input, and exact spelling.
- [ ] Run targeted tests and verify failures describe the old strict-all-meanings behavior.
- [ ] Implement normalized concept groups and the shared tolerant grade fields.
- [ ] Update user feedback copy to show approximate mastery progress without creating a meaning review card after a passing answer.
- [ ] Run vocabulary, knowledge and review tests; commit.

### Task 2: Vocabulary corruption cleanup and audit

**Files:**
- Modify: `src/content/vocabularyLearning.ts`
- Modify: `src/content/vocabularyLearning.test.ts`
- Modify: `scripts/build-vocabulary-common-meanings.mts`
- Modify: `content/v1/vocabulary-common-meanings.json`
- Modify: `content/v1/vocabulary.json`
- Modify: `docs/content-sources.md`

**Interfaces:**
- Produces: 800 cleaned runtime entries and `auditLearningVocabulary(entries): string[]` rejecting known contamination classes.
- Consumes: the grading concept parser from Task 1.

- [ ] Write failing tests for `project`, `contact`, `page`, technical noise, POS glue, and corrected contextual examples.
- [ ] Run tests and verify current data fails for the identified corruption.
- [ ] Correct the three source rows, filter dictionary noise and add curated common-sense overrides/examples.
- [ ] Regenerate common meanings and strengthen runtime audit.
- [ ] Run content tests and content audit; commit.

### Task 3: Safe per-set listening offline download

**Files:**
- Create: `src/features/listening/cacheListeningAudio.ts`
- Create: `src/features/listening/cacheListeningAudio.test.ts`
- Modify: `src/features/listening/ListeningPage.tsx`
- Modify: `src/features/listening/ListeningPage.test.tsx`
- Modify: `src/features/listening/listening.css`

**Interfaces:**
- Produces: `cacheListeningAudio(url: string, cacheStorage?: CacheStorage): Promise<'cached' | 'already-cached'>`.
- Consumes: `publicAssetUrl(listeningSet.audioSrc)` and cache name `cet4-audio-v2`.

- [ ] Write failing helper and UI tests for success, duplicate, unsupported and rejected writes.
- [ ] Run targeted tests and verify failure because the helper/button does not exist.
- [ ] Implement one-set caching with visible status and synthetic-voice disclosure.
- [ ] Run listening tests and offline Playwright smoke; commit.

### Task 4: Bounded deployed-site verification

**Files:**
- Modify: `scripts/verify-deployed-site.mts`
- Modify: `scripts/verify-deployed-site.test.ts`

**Interfaces:**
- Produces: `verifyDeployedSite(baseUrl, fetcher, { timeoutMs })` with abortable requests and Range audio probing.
- Consumes: standard Fetch API and `AbortController`.

- [ ] Write failing tests for timeout/abort and `Range: bytes=0-1023` on audio.
- [ ] Run tests and verify old unbounded/full-body behavior fails.
- [ ] Implement per-request timeout cleanup and bounded audio body validation.
- [ ] Run script tests and live deployed-site verification; commit.

### Task 5: Whole-release verification and deployment

**Files:**
- Verify all changed files and generated artifacts.

**Interfaces:**
- Consumes: Tasks 1–4 outputs.
- Produces: deployed GitHub Pages build and verification evidence.

- [ ] Run `pnpm content:validate`, `content:audit`, `audio:audit`, full Vitest, full Playwright, typecheck, lint, build, bundle, Pages, migrations, runtime, and production audit.
- [ ] Review the complete diff against this spec; fix Critical/Important findings test-first.
- [ ] Push `main`, wait for GitHub Pages success, and verify the live mobile URL.
- [ ] Record external blockers: Supabase credentials, server push infrastructure, and licensed/third-party multi-voice audio source.
