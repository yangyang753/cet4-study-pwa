# Vocabulary-first training and translation gate

Date: 2026-09-25

## Goal

Make daily CET-4 training start with deliberate vocabulary study. In ordinary practice and mistake review, require the learner to translate the English question and English options before choosing an answer. Any high-frequency vocabulary whose accepted Chinese meaning is absent from the learner's translation is saved into a visible “待掌握单词” list.

## User flow

1. “开始今日训练” always opens the vocabulary practice route.
2. Before vocabulary questions, the learner reviews ten high-frequency words. Words already marked `review` are shown first, followed by unseen words; mastered words are deprioritized.
3. Each word begins with the English side. The learner reveals the meaning and marks “还不会” or “基本认识”. “还不会” is persisted as `review`; “基本认识” is persisted as `learning`. Neither choice claims mastery.
4. After all ten words have been reviewed, the learner starts the vocabulary questions.
5. Before each objective practice or mistake-review question, the learner fills a Chinese translation for the English stem and every English option. Chinese-only options do not need a redundant translation.
6. The app checks required fields and high-frequency-word meaning coverage. It explains that this is a vocabulary coverage check, not human sentence grading.
7. Missed words are shown immediately and persisted as `review`. Existing `favorite` state is preserved. A missed word may move from `mastered` back to `review`, because the new evidence indicates weakness.
8. The answer choices unlock only after translation results and all missed-word state writes succeed. If storage fails, the learner's text remains and a retry control is shown.
9. The knowledge library offers a “只看待掌握” filter and visible status badges, so saved misses can be studied directly.

## Scope

Included:

- Today-page entry and plan presentation.
- Vocabulary warm-up on ordinary vocabulary practice.
- Translation gate for ordinary objective practice, listening practice, and queued mistake review.
- Persistent vocabulary review states and a knowledge-library filter.
- Responsive layouts for desktop and mobile.

Excluded:

- Timed mock exams, where extra translation steps would invalidate exam timing.
- The initial diagnostic, which must remain a short measurement.
- Subjective translation and writing tasks, which already collect composed responses.
- AI or full-sentence semantic grading. The app performs deterministic vocabulary evidence checks only.

## Vocabulary matching

- Tokenize English case-insensitively, including simple possessive and punctuation cleanup.
- Match exact vocabulary headwords from the 800-word inventory.
- Build accepted Chinese fragments from `meaningZh` by removing part-of-speech labels and bracketed usage notes, splitting on Chinese/English separators, trimming punctuation, and discarding fragments shorter than two Chinese characters.
- A matched word is covered when any accepted fragment appears in the translation for the segment where the word appeared.
- Common function words whose source meaning produces no reliable two-character fragment are not judged.
- If no auditable inventory words occur, non-empty required translations are sufficient to unlock the answer.

## Data and failure behavior

- Reuse `KnowledgeState` and `LearningRepository.upsertKnowledgeState`.
- Translation misses use `id: knowledge:<vocabulary id>`, `itemId: <vocabulary id>`, `status: review`, and retain the current `favorite` value.
- Warm-up choices use the same IDs with `review` or `learning`.
- No new database schema is required, so existing local and optional cloud sync remain compatible.
- Writes complete before the answer is unlocked. Failed writes produce a retry state and never silently discard learning evidence.

## Accessibility and content clarity

- Every translation field has a specific accessible label.
- Locked choices explain why they are unavailable.
- Results identify English word, source meaning, and whether it was added to “待掌握单词”.
- Keyboard users can complete the entire flow.
- Mobile fields, buttons, and word cards stack without horizontal scrolling.

## Acceptance criteria

- The Today-page primary action opens vocabulary practice regardless of the currently inferred weak skill.
- Vocabulary practice displays a ten-word warm-up before any radio answer controls.
- Ordinary practice and mistake review cannot select an answer until required translations are submitted.
- A missing high-frequency meaning causes a `review` state write and appears under the knowledge-library review filter.
- Correctly covered meanings do not create a review state.
- Storage failure keeps entered translations and leaves answer controls locked until retry succeeds.
- Mock exam and diagnostic objective questions remain unchanged.
- Unit/component tests, end-to-end tests, type checking, linting, build, and release verification pass.
