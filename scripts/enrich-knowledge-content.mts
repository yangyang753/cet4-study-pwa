import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildCollocationExample, buildVocabularyExample } from './knowledge-examples.mts';

const root = process.cwd();
const vocabularyPath = path.join(root, 'content/v1/vocabulary.json');
const collocationsPath = path.join(root, 'content/v1/collocations.json');
const inventoryPath = path.join(root, 'content/v1/inventory.json');
const vocabulary = JSON.parse(await readFile(vocabularyPath, 'utf8')) as Array<{ word: string; partOfSpeech: string; meaningZh: string }>;
const collocations = JSON.parse(await readFile(collocationsPath, 'utf8')) as Array<{ phrase: string }>;
const enrichedVocabulary = vocabulary.map((entry, index) => ({ ...entry, ...buildVocabularyExample(entry, index) }));
const enrichedCollocations = collocations.map((entry, index) => ({ ...entry, ...buildCollocationExample(entry.phrase, index) }));
const inventory = JSON.parse(await readFile(inventoryPath, 'utf8')) as Record<string, unknown>;
inventory.vocabulary = enrichedVocabulary;
inventory.collocations = enrichedCollocations;
await Promise.all([
  writeFile(vocabularyPath, `${JSON.stringify(enrichedVocabulary, null, 2)}\n`),
  writeFile(collocationsPath, `${JSON.stringify(enrichedCollocations, null, 2)}\n`),
  writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`),
]);
console.log(`Enriched ${enrichedVocabulary.length} vocabulary entries and ${enrichedCollocations.length} collocations.`);
