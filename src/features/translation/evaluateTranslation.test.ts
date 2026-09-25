import { describe, expect, it } from 'vitest';
import type { VocabularyEntry } from '../../domain/content';
import { evaluateTranslation } from './evaluateTranslation';

const vocabulary: VocabularyEntry[] = [
  { id: 'v-available', word: 'available', phonetic: '', partOfSpeech: 'a.', meaningZh: 'a.可获得的;有空的', example: '', derivatives: [], confusables: [] },
  { id: 'v-activity', word: 'activity', phonetic: '', partOfSpeech: 'n.', meaningZh: 'n.活动;活跃', example: '', derivatives: [], confusables: [] },
  { id: 'v-one', word: 'one', phonetic: '', partOfSpeech: 'num.', meaningZh: 'num.一pron.一个人', example: '', derivatives: [], confusables: [] },
];

describe('evaluateTranslation', () => {
  it('matches exact English tokens and accepts a cleaned Chinese meaning fragment', () => {
    const result = evaluateTranslation([
      { id: 'stem', text: 'When is the activity available?', translation: '这个活动什么时候有空？' },
    ], vocabulary);

    expect(result.auditableWords.map((item) => item.word)).toEqual(['activity', 'available']);
    expect(result.missedWords).toEqual([]);
  });

  it('checks meaning coverage in the segment where the word appears', () => {
    const result = evaluateTranslation([
      { id: 'stem', text: 'Choose one activity.', translation: '选择一个人。' },
      { id: 'A', text: 'It is available.', translation: '这是活动。' },
    ], vocabulary);

    expect(result.missedWords.map((item) => item.word)).toEqual(['activity', 'available']);
  });

  it('does not audit noisy meanings that have no reliable two-character fragment', () => {
    const noisy: VocabularyEntry[] = [{ id: 'v-a', word: 'a', phonetic: '', partOfSpeech: 'art.', meaningZh: 'art.一', example: '', derivatives: [], confusables: [] }];
    const result = evaluateTranslation([{ id: 'stem', text: 'A book.', translation: '一本书。' }], noisy);
    expect(result.auditableWords).toEqual([]);
    expect(result.missedWords).toEqual([]);
  });

  it('requires only non-empty translations when no auditable inventory words occur', () => {
    const result = evaluateTranslation([{ id: 'stem', text: 'Zebra.', translation: '斑马。' }], vocabulary);
    expect(result.complete).toBe(true);
    expect(result.auditableWords).toEqual([]);
  });
});
