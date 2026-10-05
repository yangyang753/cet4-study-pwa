# Vocabulary Accuracy and Learned-Word Translation Design

## Goal

Make vocabulary review trustworthy for a beginner: an answer that reaches the displayed core-meaning threshold must pass, correct answers must never enter mistake review, learner-facing meanings must stay focused on common CET-4 senses, and learned words must be reusable in short Chinese-culture Chinese-to-English practice.

## User-visible behavior

- Meaning recall passes when the learner supplies the required number of distinct accepted concepts. Extra text does not turn a passing answer into a failure.
- Only a failed spelling/meaning/translation check creates a review card or demotes mastery.
- Vocabulary cards show deduplicated, prioritized common CET-4 meanings, capped at four sense groups. Specialist, archaic, malformed, or dictionary-import noise is hidden.
- A new panel beside the aggregate review offers short Chinese-to-English practice from learned words only.
- The learner can choose “单词短句” (one learned target) or “多词短句” (two or three learned targets). Only one short prompt is shown at a time, with no answer words revealed before submission.
- Prompts prefer Chinese-culture contexts. The grader accepts defined inflections and interchangeable expressions, reports missing target words, and sends only failed target words to review.
- The feature remains local-first and responsive on phone and desktop. It does not claim semantic AI scoring or guaranteed exam results.

## Architecture

1. `strictVocabularyCheck.ts` remains the single source of truth for word recall. `correct` depends only on spelling plus the displayed required-meaning threshold; unrelated extra fragments may be reported but are non-fatal.
2. `vocabularyLearning.ts` remains the learner-facing normalization layer over licensed raw data. A reviewed priority map handles high-risk polysemous words, while normalization removes duplicate/noisy senses and audits enforce the contract across all 800 entries.
3. A focused `learnedWordTranslation.ts` module owns prompt selection and grading. It consumes learned `VocabularyEntry` values and returns a deterministic exercise model independent of React or storage.
4. `LearnedWordTranslationPanel.tsx` owns interaction. `KnowledgePage.tsx` supplies learned words and persists attempts, knowledge-state changes, and review cards through the existing repository.

## Data and grading rules

- “Learned” means a vocabulary item with a `learning`, `review`, or `mastered` knowledge state.
- Single mode uses one target; multi mode uses up to three distinct targets and is disabled until at least two learned words exist.
- Each prompt has a Chinese sentence, reference English, target word ids, and accepted English forms/phrases. The visible prompt never exposes the target English.
- A translation passes only when every target group is represented and the answer contains a minimal sentence signal. It is intentionally auditable keyword coverage, not open-ended AI evaluation; the reference answer and missing targets appear after submission.
- On pass, every target receives a correct review result. On failure, only missing target words are demoted and added to review; covered targets are not punished.
- A failed target is saved as a dedicated `word-translation` review card. The mistake center renders that card as a short Chinese-to-English sentence, so recovery proves active use rather than falling back to recognition-only questions.
- Vocabulary mistake review rotates among meaning recall, spelling/cloze, and learned-word Chinese-to-English. A translation card is cleared or advanced only after its target expression is present in the English answer.

## Error handling and persistence

- Repository writes are awaited. On failure the response remains visible and the learner can retry.
- Attempt ids are stable for one displayed prompt to prevent duplicate writes.
- No cloud-sync promise is added. Cross-device automatic progress sync still requires configured Supabase credentials and migrations.

## Verification

- Unit tests reproduce the 3/3 false-negative and verify it no longer creates a review card.
- Content tests audit all 800 learner-facing meanings for duplicate/noisy groups and representative high-risk words for CET-priority order.
- Pure-function tests cover one/multi prompt selection, learned-only input, hidden targets, inflections, and partial failure.
- Component tests cover mode switching, success, failure, repository write failure, and responsive-accessible controls.
- Review-page tests cover reopening a failed target as Chinese-to-English, a correct recovery without duplicate mistake creation, and another miss remaining due.
- Full unit, content audit, typecheck, lint, build, and targeted browser checks must pass before deployment.

## Out of scope / external requirements

- True semantic grading needs a backend language model or maintained phrase bank; this release uses transparent accepted-expression coverage.
- Automatic phone/desktop progress synchronization cannot be enabled without project Supabase URL/key and deployed migrations.
- Licensed human-recorded multi-accent listening audio requires a licensed corpus and is not fabricated here.
