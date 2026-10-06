# CET-4 Comprehensive Readiness Design

**Date:** 2026-10-06  
**Status:** Design approved in chat  
**Product goal:** Help a weak-foundation learner prepare for the December 2026 CET-4 with a reliable daily path that teaches essential language before testing it, preserves evidence, and avoids overstating score certainty.

## 1. Scope and constraints

This change closes the high-priority gaps found in the whole-application audit while preserving the existing responsive PWA, local-first storage, exam simulation, automatic progress, and evidence-based review flows.

The work must:

- keep the existing 800 entries as the **CET-4 high-frequency core**, not relabel them as the complete CET-4 vocabulary;
- add a separate **foundation essentials** layer for common function words, core verbs, and recurring CET-4 topic words missing from the 800-entry set;
- teach useful word families and confusable groups through recall, not by displaying noisy dictionary data;
- integrate foundation words, core words, collocations, word forms, and confusables into automatic study and review scheduling;
- keep quick diagnostics visibly provisional and require repeated full mocks for readiness claims;
- preserve honest limitations for local rule-based writing and translation feedback;
- improve pronunciation, reminder, backup, and cloud-readiness feedback without claiming capabilities the static deployment does not have;
- remain usable on 360 px mobile screens, with keyboard access, 200% text zoom, offline reload, and print support;
- make no secret or service-role key part of the repository.

Out of scope:

- reproducing or redistributing copyrighted historical exam papers;
- presenting the official combined CET vocabulary list as proprietary app content;
- activating Supabase without valid project credentials;
- claiming official CET standard scores or human-level essay grading;
- implementing a server-side push service in this static GitHub Pages deployment.

## 2. Content architecture

### 2.1 Vocabulary layers

The vocabulary catalog gains an explicit layer:

- `foundation`: exactly 180 high-utility words selected from missing basic function words, core verbs, study/social vocabulary, and CET-4 recurring topics;
- `core`: the existing 800 high-frequency entries;
- `extension`: reserved for future syllabus expansion and not scheduled by this change.

Foundation and core words remain visually and statistically separate. Search may cover both, but filters, counts, daily quotas, mastery states, and progress summaries identify their layer. Existing learner state continues to resolve the original 800 IDs unchanged.

Foundation words follow every learner-facing requirement already applied to core high-frequency words: hidden meanings during recall, varied no-hint question formats, automatic progress, automatic mastery decisions, later retention checks, item-level mistake routing, and automatic demotion after forgetting. A learner cannot manually mark a foundation word as mastered. The app first teaches the word, then tests meaning, spelling, contextual use, and—when available—word-family or confusable knowledge. Only a passed test advances the mastery state.

Foundation vocabulary is a complete independent learning channel rather than a filter that mixes with core vocabulary. It has its own new-word queue, previous-day recall queue, mistake queue, learning/mastered counts, review stage, due date, and completion status. A foundation mistake appears in a dedicated **基础必会词错题复习** view and does not appear inside the core high-frequency-word mistake list. Core mistakes likewise do not appear in the foundation view. Both channels may reuse the same tested engine internally, but their learner-facing sessions and statistics remain separate.

Foundation entries use the same learner-facing standards as core entries: word, phonetic, concise CET-relevant meanings, part of speech, natural example, Chinese example translation, and a stable ID. Meanings exclude archaic, technical, and very rare senses.

### 2.2 Word families and confusables

Empty placeholder arrays are not treated as useful content. A focused enrichment catalog maps high-value vocabulary IDs to:

- word-family members with part of speech and concise meaning;
- confusable words with a short distinction and contrast example.

Initial coverage prioritizes at least 120 high-impact entries/groups, including productive affixes, frequent part-of-speech transformations, and common CET confusions. Entries without useful enrichment display no empty section.

Automated content audits enforce:

- stable, known vocabulary references;
- no duplicate family forms or confusable targets;
- no self-reference;
- non-empty distinctions and examples;
- a minimum enrichment coverage threshold;
- no duplicate atomic Chinese meanings within one entry.

### 2.3 Important missing vocabulary

The foundation seed must cover these audited categories before lower-priority additions:

- function and sentence-building words such as articles, prepositions, conjunctions, pronouns, auxiliaries, and common adverbs;
- core verbs such as `see`, `think`, `go`, `use`, `work`, `support`, and `achieve`;
- recurring nouns and topics such as `time`, `way`, `year`, `world`, `school`, `education`, `research`, `society`, `government`, `technology`, `economic`, `development`, `responsibility`, `resource`, `result`, and `solution`.

Automated tests assert representative required words rather than treating one frozen list as a complete official syllabus.

## 3. Learning and review behavior

### 3.1 Daily scheduling

Daily planning calculates quotas from remaining days, unmastered counts, recent accuracy, and the learner's configured minutes. It schedules small foundation and core allocations without exceeding the existing time budget. Review due today remains higher priority than new material.

Each vocabulary channel follows the established alternating rhythm independently:

- new-learning day: learn that channel's scheduled new words; the core channel may also include its small collocation allocation;
- next day: that channel first recalls all words learned by the learner on the previous day before it offers new words;
- urgent overdue review can convert a planned new-learning slot into review-only work.

Finishing core vocabulary never marks foundation vocabulary complete, and finishing foundation vocabulary never marks the core task complete. The Today page records each route from its own evidence. When time is limited, due review comes first in both routes, followed by foundation essentials and then new core vocabulary.

### 3.2 Recall formats

Vocabulary recall randomly rotates among unambiguous formats:

- English word → concise Chinese meanings;
- Chinese meaning → complete English spelling;
- one masked part of the English word → complete spelling;
- Chinese-to-English sentence using one or a small set of learned targets;
- word-family transformation with the required part of speech shown;
- confusable contrast with a sentence context and no multiple-choice hints.

Only one target dimension is hidden in a question. The prompt must not hide both the identifying word and its meaning. Correct answers do not create mistakes. Wrong spelling, missed target meaning, wrong family form, wrong confusable choice, or failed target use creates review evidence for the affected item only.

Foundation/core vocabulary and collocations use the same mastery evidence rules but retain distinct content types and progress counters.

The foundation library therefore provides the same automatic learning loop as the core library: learn → next-day no-hint recall → automatic mastery decision → spaced review → automatic demotion after a failed review. No manual “已掌握” control is rendered anywhere in this loop. Its wrong answers are stored and reopened through the dedicated foundation mistake route, while correct answers remain outside both mistake queues.

## 4. Diagnostics and subjective work

### 4.1 Quick diagnostic

The 20-item diagnostic remains a short placement tool. Its result card must state:

- sample size;
- `初步估分`, never a plain definitive score;
- the uncertainty range;
- that weak-skill planning can use it immediately;
- that pass readiness requires at least three complete mocks.

Dashboard wording must not present the quick diagnostic as proof that the learner can pass.

### 4.2 Writing and translation

Local evaluation remains explainable and conservative. UI separates:

- submission completeness;
- rule checks such as length, sentence boundary, predicate, task coverage, repetition, and target use;
- self-review with rubric/reference answer;
- readiness evidence, which only complete mocks can strengthen.

The UI must consistently say that these checks are not official scoring or human correction. A rule-based pass records task completion but does not by itself mark CET writing or translation as stably mastered.

## 5. Pronunciation, reminders, sync, and recovery

### 5.1 Pronunciation

Word pronunciation continues to use the browser Speech Synthesis API. The control reports three distinct outcomes: unsupported API, no English voice available, and playback failure. It may offer a retry but must not silently imply successful playback. Listening exercise audio remains independent of this feature.

### 5.2 Reminders

The settings page explicitly distinguishes:

- in-app reminders that run while the app is open;
- browser notifications that still require the app to be active in the current static deployment;
- calendar export as the dependable external reminder option;
- background push, shown as unavailable until a push service exists.

No permission prompt is triggered without a user action.

### 5.3 Cloud readiness and backups

When Supabase variables are absent, the account page remains honest about local-only storage and presents export/import as the recovery path. It also provides a compact deployment-readiness checklist for the site owner: both public variables, migrations, sign-in test, two-device sync test, and last successful sync indication.

When variables are present, existing login and sync behavior remains authoritative. Configuration validation rejects partial pairs, malformed URLs, and service-role keys. This change does not invent credentials or weaken row-level security.

## 6. User interface

The Today page presents foundation and core vocabulary as separate tasks with separate quotas and completion evidence, without adding another dense dashboard card. The vocabulary library gets distinct foundation/core entry points and compact progress counts. Each entry point opens only its own learning, previous-day recall, and mistake sessions. Word-family/confusable training appears inside the relevant learning/review runner, not as a new top-level navigation destination.

On small screens:

- primary actions remain reachable without horizontal page scrolling;
- long words and Chinese meanings wrap;
- review prompts preserve a single clear input and action order;
- enrichment details use disclosure controls where needed.

## 7. Compatibility and migration

Existing IDs and mastery records for the 800 words and 126 collocations remain unchanged. New foundation and enrichment IDs use separate prefixes. Missing new fields are interpreted with safe defaults, so old backups remain importable. New backup exports include vocabulary layer and enrichment evidence where applicable.

No destructive data migration runs in the browser. If a new IndexedDB index or record type is necessary, the Dexie version upgrade is additive and tested against a legacy fixture.

## 8. Verification

Development follows red-green-refactor tests for each behavior. Required verification includes:

- content audit for foundation vocabulary and enrichment integrity;
- representative meaning, family, and confusable fixtures;
- scheduler tests for new-learning, next-day recall, overdue review, and exam-date quota pressure;
- recall tests for every prompt type and item-level mistake routing;
- diagnostic and subjective wording/eligibility tests;
- pronunciation error-state tests;
- reminder and cloud-readiness tests;
- backup compatibility tests;
- complete unit, type, lint, build, content, audio, Playwright desktop/mobile, offline, print, and Pages-contract checks;
- production dependency audit and live-site verification after deployment.

## 9. Release acceptance

The change is ready only when:

1. the existing 800 core words remain intact and a separate foundation layer is available;
2. foundation words cannot be manually marked mastered and use the same tested, automatic mastery and demotion rules as core words;
3. foundation new learning, previous-day recall, mistakes, mastery counts, and completion evidence remain separate from the core channel;
4. required audited missing words are represented with concise CET-relevant meanings;
5. high-value word-family/confusable content is tested and participates in recall;
6. review scheduling and mistake routing preserve correct answers and demote only failed targets;
7. diagnostic, subjective grading, pronunciation, reminder, and sync limitations are explicit;
8. legacy learner data and backups remain usable;
9. the full release verification passes and the clean commit is pushed to `main` for GitHub Pages deployment.
