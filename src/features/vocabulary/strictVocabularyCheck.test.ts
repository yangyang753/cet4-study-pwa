import { describe, expect, it } from 'vitest';
import type { VocabularyEntry } from '../../domain/content';
import { buildStrictVocabularyQuestions, gradeStrictVocabularyAnswer } from './strictVocabularyCheck';

const words: VocabularyEntry[] = [
  { id: 'v1', word: 'passage', phonetic: '', partOfSpeech: 'n.', meaningZh: '文章，段落', example: 'Read the passage.', derivatives: [], confusables: [] },
  { id: 'v2', word: 'benefit', phonetic: '', partOfSpeech: 'n.', meaningZh: '好处，益处', example: 'It has a benefit.', derivatives: [], confusables: [] },
  { id: 'v3', word: 'generate', phonetic: '', partOfSpeech: 'v.', meaningZh: '产生，生成', example: 'Panels generate power.', derivatives: [], confusables: [] },
];

describe('strict vocabulary check', () => {
  it('builds spelling, meaning, and dual-cloze questions over the same cohort', () => {
    expect(buildStrictVocabularyQuestions(words).map((item) => item.kind)).toEqual(['spelling', 'meaning', 'dual']);
    expect(buildStrictVocabularyQuestions(words).map((item) => item.word.id)).toEqual(['v1', 'v2', 'v3']);
  });

  it('requires exact spelling and every listed Chinese meaning', () => {
    const [spelling, meaning, dual] = buildStrictVocabularyQuestions(words);
    expect(gradeStrictVocabularyAnswer(spelling, { english: 'passage', chinese: '' }).correct).toBe(true);
    expect(gradeStrictVocabularyAnswer(spelling, { english: 'pasage', chinese: '' }).correct).toBe(false);
    expect(gradeStrictVocabularyAnswer(meaning, { english: '', chinese: '好处' }).correct).toBe(false);
    expect(gradeStrictVocabularyAnswer(meaning, { english: '', chinese: '好处和益处' }).correct).toBe(true);
    expect(gradeStrictVocabularyAnswer(dual, { english: 'generate', chinese: '产生，生成' }).correct).toBe(true);
    expect(gradeStrictVocabularyAnswer(dual, { english: 'generate', chinese: '产生' }).missingMeanings).toContain('生成');
  });
});
