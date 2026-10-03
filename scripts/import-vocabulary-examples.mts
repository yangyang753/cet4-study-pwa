import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface SourceSentence { sentence?: string; translation?: string }
interface SourceEntry { word?: string; sentences?: SourceSentence[] }
interface TargetEntry { word: string; meaningZh: string }

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: tsx scripts/import-vocabulary-examples.mts <cet4-sentence-jsonl>');

const root = process.cwd();
const vocabulary = JSON.parse(await readFile(path.join(root, 'content/v1/vocabulary.json'), 'utf8')) as TargetEntry[];
const targets = new Map(vocabulary.map((entry) => [entry.word.toLowerCase(), entry]));
const rows = (await readFile(sourcePath, 'utf8')).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as SourceEntry);

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');
const usefulTranslation = (value: string) => {
  const chinese = value.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  return chinese >= 3 && !/^(?:的)?意思是[。！？]?$/.test(value.trim());
};

function chooseSentence(word: string, candidates: SourceSentence[]) {
  const irregular: Record<string, string[]> = {
    bring: ['brought'], buy: ['bought'], keep: ['kept'], lead: ['led'], drive: ['drove', 'driven'],
    break: ['broke', 'broken'], die: ['died'], fly: ['flew', 'flown'], clothe: ['clothed', 'clad'],
  };
  const forms = [word, `${word}s`, `${word}es`, `${word}d`, `${word}ed`, `${word}ing`, ...(irregular[word] ?? [])];
  const boundary = new RegExp(`(^|[^a-z])(?:${forms.map((form) => form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})([^a-z]|$)`, 'i');
  return candidates
    .filter((item) => item.sentence && item.translation && boundary.test(item.sentence) && usefulTranslation(item.translation))
    .map((item) => ({ example: normalize(item.sentence!), exampleZh: normalize(item.translation!) }))
    .filter((item) => item.example.split(/\s+/).length >= 3 && item.example.split(/\s+/).length <= 24)
    .sort((left, right) => {
      const leftQuotes = /["“”]/.test(left.example) ? 1 : 0;
      const rightQuotes = /["“”]/.test(right.example) ? 1 : 0;
      return leftQuotes - rightQuotes || left.example.length - right.example.length;
    })[0];
}

const output: Record<string, { example: string; exampleZh: string }> = {};
for (const row of rows) {
  const word = row.word?.toLowerCase();
  if (!word || !targets.has(word)) continue;
  const selected = chooseSentence(word, row.sentences ?? []);
  if (selected) output[word] = selected;
}

await writeFile(path.join(root, 'content/v1/vocabulary-examples.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`Imported natural bilingual examples for ${Object.keys(output).length}/${targets.size} target words.`);
