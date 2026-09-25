# CET-4 Audit Gap Completion Design

## Goal

Close the learning-quality gaps found in the 2026-09-24 audit without changing the existing visual identity, offline-first behavior, 60-minute daily plan, or GitHub Pages deployment.

## Requirements

- Practice writing is complete only at 120 English words, matching the official CET-4 minimum; the UI continues to recommend 120–180 words.
- Writing and translation mastery checks collect aligned written evidence instead of unrelated grammar multiple-choice answers. A learner must pass at least 80% of four explicit checks.
- The knowledge library must clearly identify its material as original simulated practice derived from public frequency data, not historical official papers.
- Vocabulary and collocation cards must provide usable contextual examples and Chinese memory cues; release audits reject the former generic placeholder sentences.
- Listening generation should use every installed English voice and alternate speakers when the host supports multiple voices. The UI must honestly state that bundled recordings are synthetic practice audio.
- The account page should offer a daily in-app reminder time. Browser notification permission is optional and must never be required for study. Since static PWAs cannot guarantee closed-app background alarms, the app checks reminders while open and explains this limitation.
- Cloud sync remains explicitly marked offline until real Supabase deployment variables are supplied.

## Design

Keep subjective validation in small pure functions. `SubjectiveMasteryCheck` receives a study kind and source question IDs, builds a short writing or retranslation challenge, evaluates four visible rules, stores one mastery attempt, and reuses the existing mastery outcome repository flow.

Extend user settings with an optional `reminderTime`. `StudyReminder` checks once on app startup and then once per minute while the app is open, avoids duplicate reminders per day, and uses a browser notification only after explicit permission; otherwise it shows an in-app banner.

Content generation will replace the two known placeholder templates with deterministic context templates selected by part of speech/category and include a Chinese memory cue. Content audits will make placeholder regression a release failure. Listening generation discovers installed English voices and alternates them, while preserving a single-voice fallback.

## Verification

Use test-driven changes for validation, mastery, reminders, settings, and content audits. Then run content validation/audits, audio audit, unit tests, end-to-end tests, typecheck, lint, build, bundle and Pages verification before deployment.
