# Vocabulary and readiness completion design

## Goal

Make the 800-word library trustworthy for a foundation learner: show the common CET-4 meanings instead of a single partial gloss, keep the source reproducible, and close the highest-impact gaps found in the current app audit.

## Decisions

- Build `vocabulary-common-meanings.json` from two traceable dictionary inputs. KyleBing remains the CET-list source; ECDICT supplies broader everyday senses. Merge all senses for the exact headword, strip dictionary metadata, remove duplicates, and keep the hand-reviewed corrections as the final authority.
- Treat “complete” as source-backed common coverage, not an impossible promise that every rare or specialist dictionary sense is useful for CET-4. Automated checks cover all 800 headwords plus representative polysemous words.
- Add browser speech synthesis to vocabulary learning and knowledge cards. If the browser has no English voice, use its default voice; if speech synthesis is unavailable, show an honest message and leave learning usable.
- Put the existing exam-preparation checklist on the account/settings page, not Today, because the learner explicitly removed administrative preparation from the daily study page.
- Label diagnostic and mock scores as training estimates. Never claim that a rule-based estimate has officially passed 425.
- Strengthen content audit rules for official full-mock material lengths and mock inventory. Daily scaffold exercises may remain shorter; full mock papers must be distinguishable from short practice.

## Out of scope without external authority

- Cross-device automatic sync requires valid Supabase project credentials.
- Notifications after the page is closed require a push subscription and server-side sender.

The app must continue to state these limits rather than simulate success.

## Acceptance

- Every one of the 800 vocabulary items receives a non-empty merged meaning from the generated source map.
- High-risk words such as `like`, `set`, `run`, `take`, `right`, and `address` expose multiple common senses.
- Meanings remain hidden until requested and can be pronounced from both warm-up and knowledge views.
- The account page exposes the exam readiness checklist.
- Diagnostic/mock score copy consistently says “训练参考估分” and does not say the learner has definitely passed.
- Content audits identify any full mock whose passages or translation prompt are materially shorter than the official format.
- Unit tests, browser tests, content/audio audits, typecheck, lint and production build pass before publishing.
