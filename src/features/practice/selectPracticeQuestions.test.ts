import { describe, expect, it } from 'vitest';
import type { Attempt } from '../../domain/attempt';
import type { CatalogQuestion } from '../../domain/content';
import { selectPracticeQuestions } from './selectPracticeQuestions';

const question = (id: string): CatalogQuestion => ({
  id, version: 1, type: 'reading', difficulty: 'foundation', prompt: id,
  knowledgePointIds: ['reading:test'], explanationZh: '解析', sourceNote: '测试',
  options: [{ id: 'A', text: 'A' }, { id: 'B', text: 'B' }], correctAnswer: 'A', groupId: id,
});

const attempt = (questionId: string, createdAt: string): Attempt => ({
  id: `${questionId}:${createdAt}`, userId: 'learner', questionId, response: 'A', correct: true,
  score: 1, durationSeconds: 10, kind: 'reading', mode: 'practice', createdAt,
});

describe('selectPracticeQuestions', () => {
  it('prefers unseen questions before attempted questions', () => {
    const questions = [question('q-seen'), question('q-unseen')];
    const selected = selectPracticeQuestions(questions, [attempt('q-seen', '2026-09-24T08:00:00.000Z')], { kind: 'reading', date: '2026-09-24', limit: 1 });
    expect(selected.map((item) => item.id)).toEqual(['q-unseen']);
  });

  it('returns least recently attempted questions after exhausting the unseen pool', () => {
    const questions = [question('q-newest'), question('q-oldest'), question('q-middle')];
    const attempts = [
      attempt('q-newest', '2026-09-24T09:00:00.000Z'),
      attempt('q-oldest', '2026-09-20T09:00:00.000Z'),
      attempt('q-middle', '2026-09-22T09:00:00.000Z'),
    ];
    expect(selectPracticeQuestions(questions, attempts, { kind: 'reading', date: '2026-09-24', limit: 2 }).map((item) => item.id)).toEqual(['q-oldest', 'q-middle']);
  });

  it('keeps same-day unseen selection stable while returning the requested count', () => {
    const questions = ['q1', 'q2', 'q3', 'q4'].map(question);
    const first = selectPracticeQuestions(questions, [], { kind: 'reading', date: '2026-09-24', limit: 3 });
    const second = selectPracticeQuestions(questions, [], { kind: 'reading', date: '2026-09-24', limit: 3 });
    expect(second.map((item) => item.id)).toEqual(first.map((item) => item.id));
    expect(first).toHaveLength(3);
  });
});
