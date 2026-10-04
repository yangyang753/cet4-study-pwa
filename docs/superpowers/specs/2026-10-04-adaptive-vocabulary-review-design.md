# Adaptive vocabulary and review design

## Goal

Make the daily route sustainable before the 2026-12 CET-4 exam: acquisition days teach both high-frequency words and collocations, every third day consolidates prior material, and every learned item remains available for active recall even when its scheduled review date is in the future.

## Scheduling

- Use a stable three-day cycle: two acquisition days followed by one review-only day.
- Do not create an empty review-only day before the learner has prior knowledge records.
- Calculate required new-word and new-collocation quotas from the remaining unseen inventory and the remaining acquisition days before the early first-pass target.
- On acquisition days, reserve capacity for new material instead of allowing the due backlog to consume the whole session.
- On review-only days, set new quotas to zero and fill the session with due and previously learned material, prioritizing lapses and older reviews.
- Keep a stable daily cohort in the cached plan so refreshes do not replace the assigned words or collocations.

## Combined learning flow

The “先学高频词” entry becomes “学习高频词与重点搭配”. The flow is:

1. Review due/selected old words.
2. Learn and strictly recall today’s new words.
3. Learn and recall today’s collocations without choices.
4. Mark both daily vocabulary and collocation tasks complete from evidence.

Chinese culture translation remains a separate task and stays locked until the combined vocabulary/collocation flow is complete.

## Consolidation and review

- The knowledge-page aggregate drill includes all learned words, not only words whose next review time has arrived.
- Today’s learned words are prioritized, followed by due and weak words.
- Each round is capped at a useful 20-item batch so it is actionable but no longer collapses to two or three words.
- Reopening a vocabulary or collocation mistake regenerates the recall mode and blank position. Exercise instances are not cached solely by item id.

## Vocabulary content

- Learner-facing meanings contain CET-4/common senses only.
- Remove duplicate, technical, archaic, specialist and visibly rare meanings.
- Preserve reviewed high-frequency senses first and cap the visible list to avoid overload.
- Natural bilingual examples remain sentences, not dictionary-definition templates.
- Free-form Chinese grading accepts common paraphrases while rejecting a recognized meaning that clearly belongs to another word.

## Other audit fixes

- Use the local China study date instead of UTC date on the account readiness panel.
- Split large vocabulary JSON assets into a dedicated build chunk.
- Keep the README mock-exam count consistent with the app.
- Cloud sync cannot be activated without deployment Supabase credentials; retain honest local-only status and do not fabricate a connection.

## Acceptance

- Unit tests prove the two-learning/one-review cadence and dynamic word/collocation quotas.
- A learned but not-yet-due word appears in aggregate recall.
- Reopening a review item can produce another recall mode.
- Core meanings are deduplicated and capped; rare senses such as `power=幂` and `pick=镐` are not learner-facing.
- Targeted tests, full unit suite, lint, typecheck, content validation, build and browser E2E pass before deployment.
