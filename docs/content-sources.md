# Content sources

The learner-facing high-frequency vocabulary combines the project's existing CET frequency list with common Chinese meanings extracted for the same words from KyleBing/english-vocabulary (BSD-3-Clause). Only the 800 words already selected by this project are included; the source dictionary itself is not bundled. A reviewed in-project supplement adds common CET senses that are absent from the imported entries; automated audits protect representative high-risk polysemous words.

- Project: https://github.com/KyleBing/english-vocabulary
- Input: `full_line_jsonl/simple/正序/四级.jsonl`
- Generated subset: `content/v1/vocabulary-common-meanings.json`
- Regeneration: `pnpm exec tsx scripts/build-vocabulary-common-meanings.mts <path-to-四级.jsonl>`
