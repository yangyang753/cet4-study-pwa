import { describe, expect, it } from 'vitest';
import type { VocabularyEntry } from '../../domain/content';
import { buildStrictVocabularyQuestions, gradeStrictVocabularyAnswer } from './strictVocabularyCheck';

const words: VocabularyEntry[] = [
  { id: 'v1', word: 'passage', phonetic: '', partOfSpeech: 'n.', meaningZh: '文章，篇章；段落，段', example: 'Read the passage.', derivatives: [], confusables: [] },
  { id: 'v2', word: 'benefit', phonetic: '', partOfSpeech: 'n.', meaningZh: '好处，益处', example: 'It has a benefit.', derivatives: [], confusables: [] },
  { id: 'v3', word: 'generate', phonetic: '', partOfSpeech: 'v.', meaningZh: '产生，生成', example: 'Panels generate power.', derivatives: [], confusables: [] },
];

describe('strict vocabulary check', () => {
  it('builds only one-answer spelling or meaning questions over the same cohort', () => {
    expect(buildStrictVocabularyQuestions(words).map((item) => item.kind)).toEqual(['spelling', 'meaning', 'spelling']);
    expect(buildStrictVocabularyQuestions(words).map((item) => item.kind)).not.toContain('dual');
    expect(buildStrictVocabularyQuestions(words).map((item) => item.word.id)).toEqual(['v1', 'v2', 'v3']);
  });

  it('keeps spelling exact but accepts an equivalent Chinese expression', () => {
    const [spelling, meaning, nextSpelling] = buildStrictVocabularyQuestions(words);
    expect(gradeStrictVocabularyAnswer(spelling, { english: 'passage', chinese: '' }).correct).toBe(true);
    expect(gradeStrictVocabularyAnswer(spelling, { english: 'pasage', chinese: '' }).correct).toBe(false);
    expect(gradeStrictVocabularyAnswer(meaning, { english: '', chinese: '优势' })).toMatchObject({
      correct: true,
      matchedMeaningCount: 1,
      requiredMeaningCount: 1,
      missingMeanings: [],
    });
    expect(gradeStrictVocabularyAnswer(nextSpelling, { english: 'generate', chinese: '' }).correct).toBe(true);
  });

  it('passes after three distinct core meanings without requiring the whole dictionary entry', () => {
    const word: VocabularyEntry = {
      id: 'v4', word: 'make', phonetic: '', partOfSpeech: 'v.', meaningZh: '使，让；做，制造；赚得，挣到；成为；组成',
      example: 'Make a plan.', derivatives: [], confusables: [],
    };
    const question = { ...buildStrictVocabularyQuestions([word])[0], kind: 'meaning' as const };
    expect(gradeStrictVocabularyAnswer(question, { english: '', chinese: '让；制作；挣到' })).toMatchObject({
      correct: true,
      matchedMeaningCount: 3,
      requiredMeaningCount: 3,
    });
    expect(gradeStrictVocabularyAnswer(question, { english: '', chinese: '让；制作' })).toMatchObject({
      correct: false,
      matchedMeaningCount: 2,
      requiredMeaningCount: 3,
    });
  });

  it('does not count synonyms from one sense group as separate mastered meanings', () => {
    const word: VocabularyEntry = {
      id: 'v5', word: 'like', phonetic: '', partOfSpeech: 'v.', meaningZh: '喜欢，喜爱；像，如同；赞同；希望，想要',
      example: 'I like this plan.', derivatives: [], confusables: [],
    };
    const question = { ...buildStrictVocabularyQuestions([word])[0], kind: 'meaning' as const };
    expect(gradeStrictVocabularyAnswer(question, { english: '', chinese: '喜欢；喜爱；爱好' })).toMatchObject({
      correct: false,
      matchedMeaningCount: 1,
      requiredMeaningCount: 3,
    });
    expect(gradeStrictVocabularyAnswer(question, { english: '', chinese: '喜爱；像；同意' })).toMatchObject({
      correct: true,
      matchedMeaningCount: 3,
    });
  });

  it('requires all meanings when an entry has fewer than three core concepts', () => {
    const question = { ...buildStrictVocabularyQuestions([words[0]])[0], kind: 'meaning' as const };
    expect(gradeStrictVocabularyAnswer(question, { english: '', chinese: '短文' })).toMatchObject({
      correct: false,
      matchedMeaningCount: 1,
      requiredMeaningCount: 2,
      remainingMeanings: ['段落'],
    });
    expect(gradeStrictVocabularyAnswer(question, { english: '', chinese: '篇章；段' }).correct).toBe(true);
  });

  it('does not accept unrelated text through a one-character overlap', () => {
    const question = { ...buildStrictVocabularyQuestions([words[2]])[0], kind: 'meaning' as const };
    expect(gradeStrictVocabularyAnswer(question, { english: '', chinese: '学生生活很好' })).toMatchObject({
      correct: false,
      matchedMeaningCount: 0,
    });
  });
});
