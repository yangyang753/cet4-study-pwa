# CET-4 Learning Quality Completion Design

## Goal

Close the five gaps found in the 2026-09-25 audit without weakening offline use: test the exact words just studied, stop presenting low-quality vocabulary guidance as authoritative, improve translation-word detection, recover safely from storage failures, and make the boundary between local-only and cloud-synced data explicit.

## Learner and constraints

- The learner has a weak English foundation and studies for 60 minutes per day.
- The target is the 2026-12-12 CET-4 written examination.
- Desktop and 360 px mobile browsers must remain supported.
- Ordinary study remains local-first and usable offline.
- Mock exams remain exam-like and do not gain teaching gates.
- No secret, service-role key, unlicensed word list, or copied official paper may enter the repository.
- Existing Supabase synchronization is enabled only when both deployment secrets are supplied externally.

## 1. Exact warm-up assessment

`VocabularyWarmup` returns the ten displayed entries when the last learning state is saved. Vocabulary practice then replaces its independently selected question set with one meaning question per returned entry. Each question uses the entry's corrected learning meaning and three deterministic distractors. The summary and mastery check therefore measure the same words the learner just reviewed.

The warm-up still prioritizes `review`, then unseen, then `learning`, then mastered words. “还不会” records `review`; “基本认识” records `learning`; neither claims mastery.

## 2. Vocabulary quality layer

Create one typed vocabulary-learning adapter between raw JSON and UI consumers. It applies a small, reviewed correction table for confirmed misleading high-frequency entries, including `passage` and `long`. It rejects meta-definition examples containing phrases such as “is presented as” and exposes no example rather than a misleading one. Corrected entries receive short natural CET-4-oriented examples and Chinese translations.

All vocabulary UI, generated meaning questions, warm-up, knowledge cards, printing, and translation checks consume the adapter output. A content audit fails if a priority correction is missing or if a meta-definition example reaches the learning catalog. Raw licensed source data remains unchanged for provenance; corrections are project-authored overlays.

## 3. Translation coverage

Translation evaluation resolves common English inflections to vocabulary headwords: possessive, plural (`-s`, `-es`, `-ies`), past (`-ed`, `-ied`), progressive (`-ing`), and common comparative endings where the resulting headword exists. Exact matches always win.

A translation field is complete only when it contains at least one Chinese character. The result reports audited-word count, covered-word count, and missed words. Missing accepted meanings still create or update `review` knowledge states while preserving favorites. The UI continues to state that this is lexical coverage, not human semantic grading.

## 4. Storage-failure recovery

- Mastery checks retain the selected answer, leave the task unfinished, show an error, and allow retry.
- Review submission retains the answer and translation state, shows an error, and allows retry.
- Knowledge-library mastery changes are optimistic but roll back and show an error when persistence fails.
- Existing successful paths and sync-queue writes remain unchanged.

## 5. Synchronization boundary

The account page must state that application updates and learning-data synchronization are different. In local mode it gives a direct JSON export/import fallback and says that records do not automatically move between phone and computer. In cloud mode it keeps the existing login and synchronization controls.

Deployment may only become cloud-enabled through externally supplied `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The implementation must not manufacture credentials or weaken the runtime pair validation.

## Verification

- Unit tests cover exact warm-up-to-question identity, vocabulary corrections and example suppression, morphology, Chinese-field validation, and all three failure-retry paths.
- Browser tests cover the ten-word warm-up followed by a matching first question on a 360 px-capable flow.
- Content audit validates the learning vocabulary adapter.
- `pnpm release:verify` and `pnpm audit --prod` pass.

