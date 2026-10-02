# Content sources

The learner-facing high-frequency vocabulary combines the project's existing CET frequency list with Chinese meanings extracted for the same headwords from KyleBing/english-vocabulary (BSD-3-Clause) and ECDICT (MIT). ECDICT supplies broader everyday senses that a single CET-list entry may omit. Only the 800 words already selected by this project are included; neither source dictionary is bundled. A reviewed in-project supplement remains the final authority for confirmed CET senses, and automated audits protect full headword coverage plus representative high-risk polysemous words.

- Project: https://github.com/KyleBing/english-vocabulary
- Input: `full_line_jsonl/simple/正序/四级.jsonl`
- ECDICT: https://github.com/skywind3000/ECDICT (`ecdict.csv`, MIT)
- Generated subset: `content/v1/vocabulary-common-meanings.json`
- Regeneration: `pnpm exec tsx scripts/build-vocabulary-common-meanings.mts <path-to-四级.jsonl> <path-to-ecdict.csv>`
