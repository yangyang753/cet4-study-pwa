# CET-4 Content Quality Design

## Goal

Make the 800-word knowledge library concise and trustworthy: each Chinese sense appears once, common CET-4 senses come first, and every visible example is a natural sentence whose Chinese translation expresses the same sentence. Complete the related high-priority audit fixes for mastery grading, listening-content repetition, and local-data durability.

## Content rules

- Use the existing CET exam frequency order for word order.
- Within a word, place manually reviewed CET/common senses first, then the original CET-list senses, then supplemental dictionary senses.
- Split imported dictionary strings into atomic senses, remove exact and containment duplicates, remove specialist/noise senses, and cap low-value tail senses.
- Preserve genuinely different senses; do not collapse polysemy such as `mean` = “意味着 / 平均的 / 吝啬的”.
- Prefer source-backed bilingual example sentences from the BSD-licensed CET-4 sentence corpus. Fall back only to reviewed natural templates, never meta wording such as “is presented as” or Chinese quotation placeholders.
- Grade Chinese recall by structured sense groups and accepted aliases. Extra wording is not penalized; up to three distinct core senses demonstrate mastery.

## Related audit fixes

- Listening sets must not share stock tail sentences across most sets. Exact cross-set segment duplication is audited and capped.
- The app requests persistent browser storage after meaningful use, displays the result, and retains manual backup guidance.
- Offline listening downloads expose storage usage and a way to clear cached audio.

## Verification

- Unit tests prove sense-level deduplication, priority ordering, natural aligned examples, alias grouping, listening diversity, storage behavior, and cache management.
- Content audit covers all 800 words and all 24 listening sets.
- Full unit, end-to-end, typecheck, lint, build, bundle, Pages, migration, and runtime checks pass before deployment.
