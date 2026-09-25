import { describe, expect, it } from 'vitest';
import type { VocabularyEntry } from '../../domain/content';
import { evaluateTranslation } from './evaluateTranslation';

const vocabulary: VocabularyEntry[] = [
  { id: 'v-available', word: 'available', phonetic: '', partOfSpeech: 'a.', meaningZh: 'a.可获得的;有空的', example: '', derivatives: [], confusables: [] },
  { id: 'v-activity', word: 'activity', phonetic: '', partOfSpeech: 'n.', meaningZh: 'n.活动;活跃', example: '', derivatives: [], confusables: [] },
  { id: 'v-one', word: 'one', phonetic: '', partOfSpeech: 'num.', meaningZh: 'num.一个;pron.一个人', example: '', derivatives: [], confusables: [] },
  { id: 'v-study', word: 'study', phonetic: '', partOfSpeech: 'v.', meaningZh: 'v.学习', example: '', derivatives: [], confusables: [] },
  { id: 'v-use', word: 'use', phonetic: '', partOfSpeech: 'v.', meaningZh: 'v.使用', example: '', derivatives: [], confusables: [] },
  { id: 'v-large', word: 'large', phonetic: '', partOfSpeech: 'a.', meaningZh: 'a.大的', example: '', derivatives: [], confusables: [] },
];

describe('evaluateTranslation', () => {
  it('matches exact English tokens and accepts a cleaned Chinese meaning fragment', () => {
    const result = evaluateTranslation([
      { id: 'stem', text: 'When is the activity available?', translation: '这个活动什么时候有空？' },
    ], vocabulary);

    expect(result.auditableWords.map((item) => item.word)).toEqual(['activity', 'available']);
    expect(result.coveredWords.map((item) => item.word)).toEqual(['activity', 'available']);
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

  it('requires Chinese content rather than arbitrary non-empty text', () => {
    expect(evaluateTranslation([{ id: 'stem', text: 'Zebra.', translation: 'zebra' }], vocabulary).complete).toBe(false);
    const result = evaluateTranslation([{ id: 'stem', text: 'Zebra.', translation: '斑马。' }], vocabulary);
    expect(result.complete).toBe(true);
    expect(result.auditableWords).toEqual([]);
  });

  it('maps common inflections back to an existing headword', () => {
    const result = evaluateTranslation([
      { id: 'stem', text: 'Students studied and used one activity.', translation: '学生学习并使用一个活动。' },
    ], vocabulary);
    expect(result.auditableWords.map((item) => item.word)).toEqual(['study', 'use', 'one', 'activity']);
    expect(result.missedWords).toEqual([]);
  });

  it('recognizes comparative and superlative forms only through an existing headword', () => {
    const result = evaluateTranslation([
      { id: 'stem', text: 'A larger room is available.', translation: '一个更大的房间有空。' },
    ], vocabulary);
    expect(result.auditableWords.map((item) => item.word)).toEqual(['large', 'available']);
    expect(result.missedWords).toEqual([]);
  });
});
