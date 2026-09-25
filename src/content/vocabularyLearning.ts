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

function contextualExample(entry: VocabularyEntry): Pick<VocabularyEntry, 'example' | 'exampleZh'> {
  const part = entry.partOfSpeech.toLowerCase();
  const meaning = entry.meaningZh.replace(/^(?:n|v|vt|vi|a|ad|adj|adv|prep|pron|num|conj|aux)\.?/i, '').replace(/[;；].*$/, '').trim();
  if (/^(?:n\.|n\/|n$)/.test(part)) return {
    example: `The article discusses the ${entry.word} and its influence on everyday life.`,
    exampleZh: `文章讨论了${meaning || entry.meaningZh}及其对日常生活的影响。`,
  };
  if (/^(?:v|vt|vi)/.test(part)) return {
    example: `Students can ${entry.word} more confidently after regular practice.`,
    exampleZh: `经过经常练习，学生能更自信地表达“${meaning || entry.meaningZh}”这一动作。`,
  };
  if (/^(?:a\.|adj)/.test(part)) return {
    example: `The result seemed ${entry.word} after the group examined the evidence.`,
    exampleZh: `小组检查证据后，结果显得${meaning || entry.meaningZh}。`,
  };
  if (/^(?:ad\.|adv)/.test(part)) return {
    example: `The speaker explained the main point ${entry.word} during the interview.`,
    exampleZh: `采访中，说话者以“${meaning || entry.meaningZh}”的方式解释了要点。`,
  };
  return {
    example: `The word "${entry.word}" connects an important idea in today's reading passage.`,
    exampleZh: `今天的阅读文章用“${entry.word}”表达了“${meaning || entry.meaningZh}”这一重要含义。`,
  };
}

export function qualityVocabularyEntry(entry: VocabularyEntry): VocabularyEntry {
  const corrected = { ...entry, ...reviewedCorrections[entry.id] };
  if (!isSyntheticMetaExample(corrected.example) && corrected.example.trim()) return corrected;
  return { ...corrected, ...contextualExample(corrected) };
}

export const learningVocabulary: VocabularyEntry[] = (rawVocabulary as VocabularyEntry[]).map(qualityVocabularyEntry);

export function auditLearningVocabulary(entries: VocabularyEntry[]): string[] {
  const errors: string[] = [];
  for (const entry of entries) {
    if (isSyntheticMetaExample(entry.example)) errors.push(`${entry.id}: synthetic meta example is visible`);
    if (!entry.example.trim()) errors.push(`${entry.id}: example is missing`);
    if (!entry.example.toLowerCase().includes(entry.word.toLowerCase())) errors.push(`${entry.id}: example does not contain target word`);
  }
  const passage = entries.find((entry) => entry.id === 'v0001');
  if (!passage?.meaningZh.includes('文章')) errors.push('v0001: missing common reading sense');
  const long = entries.find((entry) => entry.id === 'v0030');
  if (!long?.meaningZh.includes('长的')) errors.push('v0030: missing common adjective sense');
  return errors;
}
