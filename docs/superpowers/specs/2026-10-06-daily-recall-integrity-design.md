# Daily Recall Integrity Design

## Goal

Make daily CET-4 study evidence trustworthy: mastery questions rotate, failed mastery never counts as completed, translation mistakes affect only the wrong learned words, vocabulary meanings can be hidden in one action, and vocabulary/collocation acquisition alternates with next-day consolidation.

## Learning flow

- Acquisition day: learn the calculated quota of new vocabulary and collocations, then pass strict recall.
- Consolidation day: introduce no new vocabulary or collocations; recall material learned on the preceding acquisition day plus due material.
- The cycle alternates by completed vocabulary sessions: acquisition, consolidation, acquisition, consolidation.
- A mastery check draws three questions not used in the learner's most recent mastery attempts whenever the pool permits.

## Evidence rules

- A task completion is written only when the mastery threshold is met. A failed check writes `review` knowledge state and review cards but leaves the daily task incomplete.
- Learned-word Chinese-to-English grading reports a result per target word. Only targets that are absent, misspelled, or used incompatibly are demoted and added as `word-translation` review cards.
- Sentence-level grammar/meaning feedback remains visible, but it must not automatically punish every correctly used target in a multi-word exercise.

## Knowledge library

- Add a visible bulk control for the current vocabulary list: show all meanings or hide all meanings.
- Keep individual reveal controls.
- Continue using learner-facing curated meanings capped to common CET-4 senses; add regression coverage for known noisy words and audit all collocations for complete, non-duplicated translations.

## Reliability

- Persist recent mastery attempts in the existing attempts table and derive rotation from them; no new storage schema is needed.
- Preserve saved vocabulary cohorts so refreshes do not change the day's words.
- Cloud synchronization remains unavailable until deployment receives Supabase configuration; reminders remain in-app/calendar-based until a push backend exists.

## Verification

- Unit/component regression tests for each rule.
- Existing content audits, mobile E2E, offline/PWA, typecheck, lint, build, GitHub Pages and runtime checks remain green.
