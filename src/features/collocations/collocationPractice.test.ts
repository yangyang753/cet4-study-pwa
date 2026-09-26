import { describe, expect, it } from 'vitest';
import type { KnowledgeState } from '../../domain/learning';
import { buildCollocationQuestion, collocationReviewCard, selectDailyCollocations, type CollocationEntry } from './collocationPractice';

const entries: CollocationEntry[] = [
  { id: 'c1', phrase: 'take part in', meaningZh: '参加', example: 'We take part in it.', exampleZh: '我们参加。' },
  { id: 'c2', phrase: 'benefit from', meaningZh: '从……受益', example: 'We benefit from it.', exampleZh: '我们从中受益。' },
  { id: 'c3', phrase: 'focus on', meaningZh: '专注于', example: 'Focus on study.', exampleZh: '专注学习。' },
  { id: 'c4', phrase: 'lead to', meaningZh: '导致', example: 'It leads to change.', exampleZh: '它导致变化。' },
];

describe('collocation practice', () => {
  it('builds a real four-option meaning assessment', () => {
    const question = buildCollocationQuestion(entries[0], entries);
    expect(question.type).toBe('collocation');
    expect(question.knowledgePointIds).toEqual(['collocation:c1']);
    expect(question.options).toHaveLength(4);
    expect(question.options.find((option) => option.id === question.correctAnswer)?.text).toBe('参加');
  });

  it('selects due collocations before unseen collocations and excludes future mastered items', () => {
    const states: KnowledgeState[] = [
      { id: 'knowledge:c1', itemId: 'c1', status: 'review', favorite: false, nextReviewAt: '2026-09-25T00:00:00.000Z', updatedAt: '2026-09-20T00:00:00.000Z' },
      { id: 'knowledge:c2', itemId: 'c2', status: 'mastered', favorite: false, nextReviewAt: '2026-10-10T00:00:00.000Z', updatedAt: '2026-09-20T00:00:00.000Z' },
    ];
    expect(selectDailyCollocations(entries, states, '2026-09-26T23:59:59.999Z', 3).map((item) => item.id)).toEqual(['c1', 'c3', 'c4']);
  });

  it('creates a categorized review card tied to the knowledge item', () => {
    expect(collocationReviewCard('c1', 2, '2026-09-29T08:00:00.000Z', true, '2026-09-26T08:00:00.000Z')).toMatchObject({
      questionId: 'c1:collocation', knowledgeItemId: 'c1', knowledgeKind: 'collocation', stage: 2, lastCorrect: true,
    });
  });
});

