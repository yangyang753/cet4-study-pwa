import { describe, expect, it } from 'vitest';
import type { VocabularyEntry } from '../../domain/content';
import { buildLearnedWordTranslation, gradeLearnedWordTranslation } from './learnedWordTranslation';

const word = (id: string, value: string, meaningZh: string, example: string, exampleZh: string): VocabularyEntry => ({
  id, word: value, meaningZh, example, exampleZh, phonetic: '', partOfSpeech: '', derivatives: [], confusables: [],
});

const learned = [
  word('culture', 'culture', '文化', 'Culture connects people.', '文化把人们联系在一起。'),
  word('history', 'history', '历史', 'The city has a long history.', '这座城市有悠久的历史。'),
  word('protect', 'protect', '保护', 'We should protect old buildings.', '我们应该保护古老建筑。'),
  word('ancient', 'ancient', '古老的', 'This is an ancient town.', '这是一座古老城镇。'),
];

describe('learned-word Chinese-to-English translation', () => {
  it('builds a one-word Chinese-culture sentence from learned words only', () => {
    const exercise = buildLearnedWordTranslation(learned.slice(0, 2), 'single', () => 0);
    expect(exercise).toMatchObject({ mode: 'single', promptZh: expect.stringMatching(/中国|文化|历史/), targets: [{ wordId: expect.any(String) }] });
    expect(learned.some((entry) => entry.id === exercise?.targets[0].wordId)).toBe(true);
    expect(exercise?.promptZh.toLowerCase()).not.toContain(exercise!.targets[0].word);
  });

  it('builds a multi-word sentence only when every target is learned', () => {
    const exercise = buildLearnedWordTranslation(learned, 'multi', () => 0);
    expect(exercise?.targets.length).toBeGreaterThanOrEqual(2);
    expect(exercise?.targets.length).toBeLessThanOrEqual(3);
    expect(exercise?.targets.every((target) => learned.some((entry) => entry.id === target.wordId))).toBe(true);
  });

  it('returns null for unavailable modes instead of exposing unseen words', () => {
    expect(buildLearnedWordTranslation([], 'single', () => 0)).toBeNull();
    expect(buildLearnedWordTranslation(learned.slice(0, 1), 'multi', () => 0)).toBeNull();
  });

  it('accepts inflected target forms and reports only missing targets', () => {
    const exercise = buildLearnedWordTranslation(learned, 'multi', () => 0)!;
    const complete = gradeLearnedWordTranslation(exercise, exercise.referenceAnswer);
    expect(complete).toMatchObject({ correct: true, missingWordIds: [] });

    const firstTargetOnly = `Chinese ${exercise.targets[0].word} is important.`;
    const partial = gradeLearnedWordTranslation(exercise, firstTargetOnly);
    expect(partial.correct).toBe(false);
    expect(partial.coveredWordIds).toContain(exercise.targets[0].wordId);
    expect(partial.missingWordIds).toEqual(exercise.targets.slice(1).map((target) => target.wordId));
  });

  it('rejects keyword lists that are not an English sentence', () => {
    const exercise = buildLearnedWordTranslation(learned, 'multi', () => 0)!;
    expect(gradeLearnedWordTranslation(exercise, exercise.targets.map((target) => target.word).join(' '))).toMatchObject({
      correct: false,
      sentenceComplete: false,
    });
  });

  it('rejects misspelled pseudo-inflections instead of treating them as valid forms', () => {
    const city = word('city', 'city', '城市', 'This city has a long history.', '这座城市有悠久的历史。');
    const exercise = buildLearnedWordTranslation([city], 'single', () => 0)!;
    expect(gradeLearnedWordTranslation(exercise, 'This citys has a long history.')).toMatchObject({
      correct: false,
      missingWordIds: ['city'],
    });
  });
});
