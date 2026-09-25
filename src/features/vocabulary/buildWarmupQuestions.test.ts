import { describe, expect, it } from 'vitest';
import type { VocabularyEntry } from '../../domain/content';
import { buildWarmupQuestions } from './buildWarmupQuestions';

const words: VocabularyEntry[] = Array.from({ length: 4 }, (_, index) => ({
  id: `v${index + 1}`, word: `word${index + 1}`, phonetic: '', partOfSpeech: 'n.',
  meaningZh: `词义${index + 1}`, example: '', derivatives: [], confusables: [],
}));

describe('buildWarmupQuestions', () => {
  it('creates one ordered question for every warmed word', () => {
    const questions = buildWarmupQuestions(words, words);
    expect(questions.map((question) => question.groupId)).toEqual(['v1', 'v2', 'v3', 'v4']);
    expect(questions.map((question) => question.prompt)).toEqual(words.map((word) => `请选择 ${word.word} 的正确含义。`));
  });

  it('keeps the correct meaning and four unique choices', () => {
    for (const question of buildWarmupQuestions(words, words)) {
      const correct = question.options.find((option) => option.id === question.correctAnswer);
      const expected = words.find((word) => word.id === question.groupId)?.meaningZh;
      expect(correct?.text).toBe(expected);
      expect(new Set(question.options.map((option) => option.text))).toHaveLength(4);
    }
  });
});
