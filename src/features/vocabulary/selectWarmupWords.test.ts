import { describe, expect, it } from 'vitest';
import type { VocabularyEntry } from '../../domain/content';
import type { KnowledgeState } from '../../domain/learning';
import { selectWarmupWords } from './selectWarmupWords';

const words = Array.from({ length: 14 }, (_, index): VocabularyEntry => ({
  id: `v${index + 1}`,
  word: `word${index + 1}`,
  phonetic: '',
  partOfSpeech: 'n.',
  meaningZh: `含义${index + 1}`,
  example: `Example ${index + 1}.`,
  derivatives: [],
  confusables: [],
}));

describe('selectWarmupWords', () => {
  it('puts review words first and mastered words after unseen words', () => {
    const states: KnowledgeState[] = [
      { id: 'knowledge:v3', itemId: 'v3', status: 'review', favorite: false, updatedAt: '2026-09-25T00:00:00.000Z' },
      { id: 'knowledge:v1', itemId: 'v1', status: 'mastered', favorite: false, updatedAt: '2026-09-25T00:00:00.000Z' },
    ];

    const selected = selectWarmupWords(words, states, 4);

    expect(selected.map((item) => item.id)).toEqual(['v3', 'v2', 'v4', 'v5']);
  });

  it('returns ten unique words by default', () => {
    const selected = selectWarmupWords(words, [], undefined);
    expect(selected).toHaveLength(10);
    expect(new Set(selected.map((item) => item.id))).toHaveLength(10);
  });
});
