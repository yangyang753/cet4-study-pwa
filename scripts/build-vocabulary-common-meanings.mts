import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: tsx scripts/build-vocabulary-common-meanings.mts <cet4-jsonl>');

const root = process.cwd();
const vocabulary = JSON.parse(await readFile(path.join(root, 'content/v1/vocabulary.json'), 'utf8')) as Array<{ word: string }>;
const sourceEntries = (await readFile(sourcePath, 'utf8')).trim().split(/\r?\n/).map((line) => JSON.parse(line)) as Array<{
  word: string;
  translations?: Array<{ translation?: string }>;
}>;
const byWord = new Map(sourceEntries.map((entry) => [entry.word.toLowerCase(), entry]));
const meanings = Object.fromEntries(vocabulary.flatMap((entry) => {
  const translations = byWord.get(entry.word.toLowerCase())?.translations
    ?.map((item) => item.translation?.trim())
    .filter((value): value is string => Boolean(value)) ?? [];
  return translations.length ? [[entry.word, [...new Set(translations)].join('；')]] : [];
}));

await writeFile(path.join(root, 'content/v1/vocabulary-common-meanings.json'), `${JSON.stringify(meanings, null, 2)}\n`, 'utf8');
console.log(`Built common meanings for ${Object.keys(meanings).length}/${vocabulary.length} high-frequency words.`);
