import { describe, expect, it } from 'vitest';
import type { VocabularyEntry } from '../../domain/content';
import { buildVocabularyPassage } from './buildVocabularyPassage';

const word = (id: string, value: string, example = ''): VocabularyEntry => ({
  id, word: value, phonetic: '', partOfSpeech: 'n.', meaningZh: `${value}的含义`, example,
  derivatives: [], confusables: [],
});

describe('buildVocabularyPassage', () => {
  it('creates auditable sentences containing every selected target word', () => {
    const result = buildVocabularyPassage([
      word('v1', 'passage', 'Read the passage before class.'),
      word('v2', 'benefit'),
      word('v3', 'improve', 'Practice can improve your reading.'),
    ]);
    expect(result.words.map((item) => item.id)).toEqual(['v1', 'v2', 'v3']);
    expect(result.text.toLowerCase()).toContain('passage');
    expect(result.text.toLowerCase()).toContain('benefit');
    expect(result.text.toLowerCase()).toContain('improve');
  });

  it('covers the entire daily word set and handles an empty session', () => {
    const result = buildVocabularyPassage(Array.from({ length: 8 }, (_, index) => word(`v${index}`, `term${index}`)));
    expect(result.words).toHaveLength(8);
    expect(result.text).toContain('term7');
    expect(buildVocabularyPassage([])).toEqual({ text: '', words: [] });
  });
});
