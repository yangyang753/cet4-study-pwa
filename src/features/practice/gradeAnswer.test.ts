import { describe, expect, it } from 'vitest';
import type { ObjectiveQuestion } from '../../domain/content';
import { gradeAnswer } from './gradeAnswer';

const question: ObjectiveQuestion = {
  id: 'q-1', version: 1, type: 'vocabulary', difficulty: 'foundation', prompt: 'Choose.',
  knowledgePointIds: ['kp-1'], explanationZh: '解析', sourceNote: 'Original exercise modeled on the official CET-4 format',
  options: [{ id: 'A', text: 'one' }, { id: 'B', text: 'two' }], correctAnswer: 'A',
};

describe('gradeAnswer', () => {
  it('grades a single-choice answer deterministically', () => {
    expect(gradeAnswer(question, ' A ')).toEqual({ correct: true, score: 1, normalizedResponse: 'A', feedbackKey: 'correct' });
  });

  it('grades ordered matching answers and allows repeated paragraph choices', () => {
    const matching = { ...question, type: 'matching' as const, correctAnswer: ['B', 'B', 'A'] };
    expect(gradeAnswer(matching, ['b', 'B', 'a']).correct).toBe(true);
    expect(gradeAnswer(matching, ['B', 'A', 'B']).correct).toBe(false);
  });

  it('treats an unanswered question as incorrect without throwing', () => {
    expect(gradeAnswer(question, '')).toMatchObject({ correct: false, score: 0, feedbackKey: 'unanswered' });
  });
});
