import rawVocabulary from '../../content/v1/vocabulary.json';
import type { VocabularyEntry } from '../domain/content';

const reviewedCorrections: Record<string, Partial<VocabularyEntry>> = {
  v0001: {
    partOfSpeech: 'n.',
    meaningZh: '文章，段落；通道，通路',
    example: 'Read the passage carefully before answering the questions.',
    exampleZh: '回答问题前请仔细阅读这篇文章。',
  },
  v0030: {
    partOfSpeech: 'a./ad.',
    meaningZh: '长的；长时间的，长期地',
    example: 'It did not take long to finish the reading task.',
    exampleZh: '完成这项阅读任务没有花很长时间。',
  },
};

const isSyntheticMetaExample = (example: string) => /\bis presented as\b/i.test(example);

export function qualityVocabularyEntry(entry: VocabularyEntry): VocabularyEntry {
  const corrected = { ...entry, ...reviewedCorrections[entry.id] };
  if (!isSyntheticMetaExample(corrected.example)) return corrected;
  return { ...corrected, example: '', exampleZh: '' };
}

export const learningVocabulary: VocabularyEntry[] = (rawVocabulary as VocabularyEntry[]).map(qualityVocabularyEntry);

export function auditLearningVocabulary(entries: VocabularyEntry[]): string[] {
  const errors: string[] = [];
  for (const entry of entries) {
    if (isSyntheticMetaExample(entry.example)) errors.push(`${entry.id}: synthetic meta example is visible`);
  }
  const passage = entries.find((entry) => entry.id === 'v0001');
  if (!passage?.meaningZh.includes('文章')) errors.push('v0001: missing common reading sense');
  const long = entries.find((entry) => entry.id === 'v0030');
  if (!long?.meaningZh.includes('长的')) errors.push('v0030: missing common adjective sense');
  return errors;
}
