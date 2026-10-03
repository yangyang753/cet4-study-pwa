import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [kyleBingPath, ecdictPath] = process.argv.slice(2);
if (!kyleBingPath || !ecdictPath) {
  throw new Error('Usage: tsx scripts/build-vocabulary-common-meanings.mts <cet4-jsonl> <ecdict.csv>');
}

type VocabularySource = { word: string; meaningZh?: string };
type KyleBingEntry = { word: string; translations?: Array<{ translation?: string }> };

const root = process.cwd();
const vocabulary = JSON.parse(await readFile(path.join(root, 'content/v1/vocabulary.json'), 'utf8')) as VocabularySource[];
const targetWords = new Set(vocabulary.map((entry) => entry.word.toLowerCase()));

function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field); field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field); field = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else {
      field += character;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function cleanMeaning(value: string) {
  return value
    .replace(/\\n/g, '\n')
    .split(/\r?\n/)
    .filter((line) => !/^\s*\[(?:网络|医|计|化|经|法|地质|生物|农|物|数|电子|航|军)\]/.test(line))
    .join('；')
    .replace(/\[(?:机|计算机|网络|医|计|化|经|法|地质|生物|农|物|数|电子|航|军)\][^；;]*/g, '')
    .replace(/[^；;]*(?:标准输出设备|批处理命令|文件分配表|磁盘操作系统)[^；;]*/g, '')
    .replace(/(?:n|v|vt|vi|a|ad|adj|adv|pron|num|art|prep|conj|aux|modal|det|int)\.\s*/gi, '；')
    .replace(/(?<=[\u3400-\u9fff])(?:n|v|vt|vi|a|ad|adj|adv|pron|num|art|prep|conj|aux|modal|det|int)(?=[\u3400-\u9fff])/gi, '；')
    .replace(/\s*[；;]\s*/g, '；')
    .replace(/；+/g, '；')
    .replace(/^；|；$/g, '')
    .trim();
}

function fragments(value: string) {
  return cleanMeaning(value).split('；').map((item) => item.trim()).filter(Boolean);
}

function merge(...values: string[]) {
  const result: string[] = [];
  for (const fragment of values.flatMap(fragments)) {
    const normalized = fragment.replace(/[\s，,。、（）()…·]/g, '').toLowerCase();
    if (!normalized) continue;
    const duplicate = result.some((existing) => {
      const comparable = existing.replace(/[\s，,。、（）()…·]/g, '').toLowerCase();
      return comparable === normalized || (normalized.length >= 4 && comparable.includes(normalized));
    });
    if (!duplicate) result.push(fragment);
  }
  return result.join('；');
}

const kyleEntries = (await readFile(kyleBingPath, 'utf8')).trim().split(/\r?\n/).map((line) => JSON.parse(line)) as KyleBingEntry[];
const kyleByWord = new Map<string, string[]>();
for (const entry of kyleEntries) {
  const word = entry.word.toLowerCase();
  if (!targetWords.has(word)) continue;
  const meanings = entry.translations?.map((item) => item.translation?.trim() ?? '').filter(Boolean) ?? [];
  kyleByWord.set(word, [...(kyleByWord.get(word) ?? []), ...meanings]);
}

const csvRows = parseCsv(await readFile(ecdictPath, 'utf8'));
const header = csvRows.shift() ?? [];
const wordIndex = header.indexOf('word');
const translationIndex = header.indexOf('translation');
if (wordIndex < 0 || translationIndex < 0) throw new Error('ECDICT CSV is missing word or translation columns.');
const ecdictByWord = new Map<string, string[]>();
for (const row of csvRows) {
  const word = (row[wordIndex] ?? '').trim().toLowerCase();
  if (!targetWords.has(word)) continue;
  const translation = row[translationIndex]?.trim();
  if (translation) ecdictByWord.set(word, [...(ecdictByWord.get(word) ?? []), translation]);
}

const meanings = Object.fromEntries(vocabulary.map((entry) => {
  const word = entry.word.toLowerCase();
  const value = merge(entry.meaningZh ?? '', ...(kyleByWord.get(word) ?? []), ...(ecdictByWord.get(word) ?? []));
  if (!value) throw new Error(`No Chinese meaning found for ${entry.word}.`);
  return [word, value];
}));

await writeFile(path.join(root, 'content/v1/vocabulary-common-meanings.json'), `${JSON.stringify(meanings, null, 2)}\n`, 'utf8');
console.log(`Built common meanings for ${Object.keys(meanings).length}/${vocabulary.length} high-frequency words (KyleBing + ECDICT).`);
