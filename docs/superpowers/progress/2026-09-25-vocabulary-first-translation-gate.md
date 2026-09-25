# Vocabulary-first training flow — completion record

Implemented the approved beginner-first flow for the CET-4 study PWA:

- Daily vocabulary practice now starts with a ten-word English-first warm-up.
- Words marked “还不会” or “基本认识” are persisted without being falsely marked mastered.
- Objective practice, listening, and queued review questions require Chinese translations of every English stem and option before choices unlock.
- Missed high-frequency meanings are saved as review words while existing favorites are preserved.
- The knowledge library shows learning/review states and provides a “只看待掌握” filter.
- Mock exams and diagnostic flows remain exam-like and are not interrupted by the teaching gate; Chinese-only questions also bypass it.
- Save failures preserve the learner's input and offer retry instead of silently unlocking.

Verification on 2026-09-25:

- `pnpm release:verify`: passed.
- Unit tests: 57 files, 221 tests passed.
- Browser tests: 9 passed, including 360 px mobile layout, offline persistence, vocabulary warm-up, translation unlock, printing, PWA metadata, and mock-section continuity.
- Content audit: 800 vocabulary entries, 126 collocations, 15 grammar topics, 24 listening sets, 30 reading sets, 12 translation items, 12 writing prompts, and 6 mock exams.
- Audio audit: all 24 listening files passed.
- TypeScript, ESLint, production/PWA build, bundle budget, GitHub Pages contract, Supabase migrations, and runtime configuration passed.
- `pnpm audit --prod`: no known vulnerabilities.

The release is currently configured for offline/local-device learning data. Cross-device progress synchronization still requires both Supabase environment variables documented by the project.
