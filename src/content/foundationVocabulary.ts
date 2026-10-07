import source from '../../content/v1/foundationVocabulary.json';
import type { VocabularyEntry } from '../domain/content';

export const foundationVocabulary = source as VocabularyEntry[];

function containsTarget(example: string, word: string) {
  return new RegExp(`(^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i').test(example);
}

export function auditFoundationVocabulary(entries: VocabularyEntry[], core: VocabularyEntry[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const words = new Set<string>();
  const coreWords = new Set(core.map((entry) => entry.word.toLowerCase()));
  if (entries.length !== 203) errors.push(`foundation vocabulary: expected 203, received ${entries.length}`);
  for (const entry of entries) {
    const word = entry.word.toLowerCase();
    if (!/^f\d{4}$/.test(entry.id)) errors.push(`${entry.id}: invalid foundation id`);
    if (ids.has(entry.id)) errors.push(`${entry.id}: duplicate id`);
    if (words.has(word)) errors.push(`${entry.id}: duplicate word ${word}`);
    if (coreWords.has(word)) errors.push(`${entry.id}: duplicates core word ${word}`);
    ids.add(entry.id); words.add(word);
    if (entry.layer !== 'foundation') errors.push(`${entry.id}: layer must be foundation`);
    if (![entry.phonetic, entry.partOfSpeech, entry.meaningZh, entry.example, entry.exampleZh ?? ''].every((value) => value.trim())) errors.push(`${entry.id}: incomplete content`);
    if (entry.meaningZh.split('；').length > 4) errors.push(`${entry.id}: too many meaning groups`);
    if (!/[.!?]$/.test(entry.example.trim())) errors.push(`${entry.id}: example is incomplete`);
    if (!containsTarget(entry.example, entry.word)) errors.push(`${entry.id}: example does not contain target word`);
  }
  return errors;
}
