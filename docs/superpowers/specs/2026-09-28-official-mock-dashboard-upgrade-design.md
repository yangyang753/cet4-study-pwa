# Official Mock and Dashboard Upgrade Design

## Goal

Turn the study home page into a polished, information-dense CET-4 preparation dashboard and close the learning-quality gaps found in the 2026-09-28 audit. The experience remains optimized for a weak-foundation learner studying 60 minutes per day for the 2026-12-12 CET-4 exam.

## Product decisions

- The Today page becomes a preparation cockpit: a clear daily route, score/readiness summary, vocabulary runway, weak-skill guidance, task progress, exam preparation, and weekly evidence. Desktop uses layered cards and a compact rail; mobile preserves the same hierarchy in one column.
- The official exam blueprint is enforced by subtype: listening 7 news, 8 conversation, 10 passage; reading 10 cloze, 10 matching, 10 careful-reading; plus writing and translation. Generated original content remains clearly labeled as simulated, never as official past-paper text.
- Cloze and matching receive exam-specific interactions instead of being presented as ordinary four-option questions. Cloze uses a shared 15-item bank for 10 blanks; matching uses A–J paragraph choices for 10 statements. Attempts and resumed exams remain backward compatible.
- During the final 28 days, a 60-minute day uses sectional mock practice. A full 125-minute mock appears only on a deterministic weekly full-mock day and is explicitly outside the 60-minute routine.
- Pre-answer Chinese translation requires meaningful segment coverage. Random two-character input cannot unlock an answer. Missing auditable high-frequency meanings still creates review records.
- Subjective feedback remains local and explainable, but gains stronger task coverage and language checks. The interface must not imply an official score or guaranteed pass.
- Content provenance is visible: vocabulary frequency data is sourced; other materials are original simulations informed by the official CET structure. The app provides a compact exam-trend/topic map without copying copyrighted past-paper passages.
- Production stays honest about cloud capability. Without Supabase keys, records remain device-local; the dashboard adds a backup-health warning and one-click route to export. No fake background push or fake cross-device sync.

## Architecture

### Exam blueprint and interactions

`examBlueprint.ts` selects deterministic, mostly non-overlapping subtype pools per mock and returns an official-format contract. `examQuestionFormat.ts` derives cloze banks and matching paragraph labels without changing the source practice catalog. `ExamQuestionView.tsx` owns objective rendering by format and keeps `ExamSession.tsx` focused on persistence and timing. The content audit validates exact subtype counts, not only total counts.

### Planning

`planDay.ts` distinguishes `sectional-mock` from `mock`. Weekly full mocks expose a 125-minute exception; other sprint days remain within the configured daily budget. Existing evidence adaptation remains in place.

### Learning evidence

Translation evaluation returns completeness, segment quality, coverage ratio, and missed vocabulary. Unlocking requires every segment to be meaningful and auditable coverage to meet a conservative threshold when auditable words exist. Subjective evidence adds topic relevance and sentence-level heuristics while retaining its disclaimer.

### Dashboard

The page is decomposed into small presentational sections: mission header, readiness strip, focus runway, daily route, evidence panel, and preparation tools. Existing repository data remains the source of truth. CSS tokens, responsive grids, progress bars, subtle gradients, and restrained motion provide the premium visual treatment.

## Failure handling and migration

- Existing version-5 IndexedDB data and active exams must open unchanged.
- Legacy exam answers that are strings remain valid. New cloze and matching responses are still stored per question as strings.
- Missing audio never marks an unanswered question wrong.
- Failed local persistence blocks progression and preserves the current response.
- Offline mode always states that cross-device sync is unavailable and recommends a recent backup.

## Verification

- Unit tests enforce official subtype counts, deterministic selection, sprint/full-mock scheduling, translation rejection/acceptance, and subjective disclaimers.
- Component tests cover cloze bank and matching interactions plus the redesigned dashboard hierarchy.
- Browser tests cover 360 px mobile, desktop, 200% text, offline restoration, active-exam migration, audio URLs, and all primary routes.
- Release verification, dependency audit, GitHub Pages deployment, and a live 390 px smoke test must pass before completion.
