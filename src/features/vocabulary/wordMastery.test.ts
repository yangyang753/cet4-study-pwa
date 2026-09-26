import { describe, expect, it } from 'vitest';
import type { KnowledgeState } from '../../domain/learning';
import { recordMeaningResult, recordSpellingResult, recordTranslationResult, vocabularyReviewCard } from './wordMastery';

const now = '2026-09-25T08:00:00.000Z';
const mastered: KnowledgeState = {
  id: 'knowledge:v1', itemId: 'v1', status: 'mastered', favorite: true,
  reviewStage: 3, lapseCount: 0, updatedAt: '2026-09-24T08:00:00.000Z',
};

describe('word mastery state machine', () => {
  it('records successful translation as learning rather than mastery', () => {
    expect(recordTranslationResult(undefined, 'v1', true, now)).toMatchObject({ status: 'learning', reviewStage: 0 });
  });

  it('keeps a word in review after its first correct meaning assessment', () => {
    expect(recordMeaningResult(recordTranslationResult(undefined, 'v1', true, now), 'v1', true, now)).toMatchObject({
      status: 'review', itemId: 'v1', reviewStage: 1,
    });
  });

  it('demotes a mastered word after any later failure and preserves preferences', () => {
    expect(recordMeaningResult(mastered, 'v1', false, now)).toMatchObject({
      status: 'review', favorite: true, reviewStage: 0, lapseCount: 1,
    });
  });

  it('creates a dedicated spelling review card', () => {
    expect(vocabularyReviewCard('v1', 'cloze', now)).toMatchObject({
      questionId: 'v1:spelling', wordId: 'v1', format: 'word-cloze', lastCorrect: false,
    });
  });

  it('does not promote a never-verified word from spelling alone', () => {
    const review = recordTranslationResult(undefined, 'v1', false, now);
    expect(recordSpellingResult(review, 'v1', true, now)).toMatchObject({ status: 'learning' });
    expect(recordSpellingResult(mastered, 'v1', true, now)).toMatchObject({ status: 'mastered' });
  });
});
