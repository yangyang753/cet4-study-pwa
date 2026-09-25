# Vocabulary Mastery Loop Specification

## Goal

Turn the vocabulary warm-up into a measurable loop that reviews old words, learns an adaptive number of new words, checks those words in a short translation, and sends misses to review before objective questions begin.

## Learner flow

1. The vocabulary practice route loads the learner snapshot and computes today's workload.
2. Due previously learned words are tested first with partial- or full-word cloze prompts.
3. Missed or skipped review words become `review`; correct words advance through spaced review stages.
4. The learner studies today's new words. The quota adapts to the number of unmastered words and days before the exam, reserving the last 14 days for consolidation. It is bounded to fit a 60-minute plan.
5. After every new word has been classified, the app presents a deterministic short English passage using the words from that session.
6. The learner submits a Chinese translation. The app audits whether accepted Chinese meanings for each target word are present, immediately sends misses to review, and allows a false-positive correction.
7. The existing generated meaning questions then test the exact same new words.

## Scheduling

- Review intervals are 1, 3, 7, 14, and 30 days.
- `KnowledgeState` gains optional `reviewStage`, `nextReviewAt`, `lastReviewedAt`, and `lapseCount` fields so existing backups remain compatible.
- Daily new-word quota is `ceil(unmastered / learningDays)`, where `learningDays = max(1, daysRemaining - 14)`, clamped from 10 through 20. If no words remain it is zero.
- Daily old-word review is the due subset, capped at 15 and ordered by overdue date, then frequency.

## Assessment rules

- Early review stages remove some letters while preserving the first letter when possible; later stages require the entire word.
- Answers are case-insensitive and trim whitespace.
- Passage generation is deterministic and uses only learner-visible reviewed example sentences. If an entry lacks a usable example, it uses a simple controlled sentence that contains the exact target word.
- Translation grading reuses the existing accepted-meaning audit. It is a vocabulary-coverage check, not a claim of full semantic or grammar scoring.
- A missed word creates or updates a stable review card using its existing `${wordId}:meaning` catalog question so it appears in the current wrong-question page.

## Dashboard and score language

- Today's focus reports due old words, adaptive new words, remaining unmastered words, and the projected completion date.
- The app retains 425 as the reference threshold and presents 450 as a safer training target. It must not promise an exam pass.

## Reliability and compatibility

- Every state change is saved through `LearningRepository`, preserving local-first behavior and existing cloud synchronization.
- New optional state fields pass through backups and remote payloads without requiring a destructive migration.
- A failed save keeps the current answer and provides retry; completion cannot advance while persistence failed.
- Desktop and mobile layouts remain responsive and keyboard accessible.

