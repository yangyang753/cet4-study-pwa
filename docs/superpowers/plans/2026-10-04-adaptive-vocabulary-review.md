# Adaptive vocabulary and review implementation plan

> Execution method: implement directly on `main`, as explicitly requested for automatic GitHub/mobile deployment.

## Task 1: Adaptive vocabulary and collocation workload

- Extend vocabulary workload with a stable review-only flag and acquisition-day count.
- Add collocation workload calculation with due, consolidation and new cohorts.
- Write red tests for the three-day cadence, reserved acquisition capacity and distance-based quotas.
- Implement until the focused tests pass.

## Task 2: Combined daily learning session

- Persist stable daily collocation ids in the cached plan.
- Continue from word recall into collocation recall and complete both evidence-backed tasks.
- Update Today-page labels, workload metrics and route details.
- Add component tests for collocation continuation and refresh-safe state.

## Task 3: Useful aggregate recall and varied review

- Select learned words even before their next scheduled review date, prioritize today/due/weak records and cap a round at 20.
- Force vocabulary/collocation exercise regeneration whenever a review card is reopened.
- Add tests that reproduce the current zero-count and cached-question failures.

## Task 4: CET-focused meanings and grading

- Cap learner-facing meaning groups and aliases, filter specialist/rare senses and retain reviewed CET senses first.
- Add dictionary-aware detection for unrelated extra meanings while retaining paraphrase tolerance.
- Make collocation Chinese recall accept close common paraphrases.
- Update content audits and tests.

## Task 5: Audit cleanup and release

- Fix local-date rendering in Account readiness.
- Split vocabulary content into its own production chunk and update documentation counts.
- Run focused tests, all unit tests, typecheck, lint, content/audio validation, production build and Playwright E2E.
- Commit, push `main`, wait for GitHub Pages and verify the deployed URL.
