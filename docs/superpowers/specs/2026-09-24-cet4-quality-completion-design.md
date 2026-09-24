# CET-4 Quality Completion Design

## Intent

Improve the existing CET-4 study PWA for one beginner preparing for the 12 December 2026 CET-4 exam with a 60-minute daily plan. Preserve the current visual identity, offline-first behavior, A4 printing, GitHub Pages URL, and automatic daily-plan completion while making the learning evidence trustworthy and the practice content meaningfully varied.

The user asked for direct execution without additional approval stops. The implementation may therefore proceed from this reviewed design into a written plan and native execution.

## Content quality

- Keep 24 listening sets, 30 reading sets, 12 translations, 12 writing prompts, 800 vocabulary entries, 126 collocations, 15 grammar topics, and 6 full mock exams.
- Replace the universal listening and reading templates with distinct, original CET-4-style material. Each set must have its own situation, facts, discourse structure, and explanations.
- Listening must cover news, conversations, and passages. Reading must cover cloze-style context, matching-style material, and careful reading while retaining the existing objective-question interface.
- Writing and translation prompts must vary both topic and sentence/instruction structure.
- Material is original simulation informed by publicly known CET-4 formats and high-frequency skills; it must not claim to reproduce official past papers.
- Automated audits must fail release verification when exact normalized passages repeat, prompt diversity falls below the defined threshold, answer positions are excessively biased, mock counts are wrong, or referenced audio is missing.
- Regenerated audio must match every listening transcript and remain available offline after use.

## Trustworthy progress

- A blank or implausibly short writing/translation response must not complete a task. Practice writing requires at least 80 English words; translation requires at least 15 English words and sentence-ending punctuation.
- Validation copy must explain the unmet requirement without discarding the draft.
- Objective-practice results may be shown immediately, but navigation and completion remain blocked until the attempt is durably saved. A failed save exposes a working retry action.
- Knowledge-library mastery must hydrate from IndexedDB on page load and survive reload, backup restore, and cloud merge.
- Review scheduling must use the stored exam date rather than a component constant.

## Settings and exam readiness

- Add a learning-settings panel under Account for exam date, daily minutes, and default listening speed.
- Accepted daily minutes are 20–180. Playback choices are 0.75, 1, 1.25, and 1.5. The official default exam date remains 2026-12-12.
- Today planning, countdowns, review scheduling, and listening startup consume the stored values.
- Add a local exam-readiness checklist for registration confirmed, admission ticket prepared, and equipment prepared. Persist it in user settings and include it in backup/sync.
- Show date-aware reminders on Today without browser push notifications: registration confirmation until checked, admission-ticket preparation during the final 14 days, and equipment preparation during the final 3 days.

## Mobile/PWA/accessibility

- Add an install-help control that uses `beforeinstallprompt` when available and otherwise gives concise iPhone/Android browser instructions.
- Add 192 px, 512 px, maskable, and Apple touch PNG icons while retaining the SVG favicon.
- Every routed learning page, including objective exercise routes, must expose an `h1`.
- Preserve the 360 px no-horizontal-scroll and serious/critical axe checks.

## Cloud boundary

- Keep local storage fully functional without Supabase secrets.
- Do not claim cross-device sync is active unless both runtime variables are present.
- Keep the owner-scoped migrations and document the exact external activation steps. Add a release-visible configuration check, but do not invent credentials or a Supabase project.

## Verification

- Every behavior change follows red-green TDD.
- Release verification covers content diversity, subjective validation, retryable saving, mastery hydration, settings propagation, readiness reminders, PWA metadata, all core phone routes, offline reopening, audio requests, bundle budget, GitHub Pages routing, and migration contracts.
- After merging, push `main`, wait for the matching Pages workflow, and verify both the app URL and one audio URL return HTTP 200.

