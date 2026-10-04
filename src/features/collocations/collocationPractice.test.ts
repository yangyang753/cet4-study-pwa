import { describe, expect, it } from 'vitest';
import type { KnowledgeState } from '../../domain/learning';
import { buildCollocationRecallExercise, buildCollocationWorkload, collocationReviewCard, gradeCollocationRecall, selectDailyCollocations, type CollocationEntry } from './collocationPractice';

const entries: CollocationEntry[] = [
  { id: 'c1', phrase: 'take part in', meaningZh: '参加', example: 'We take part in it.', exampleZh: '我们参加。' },
  { id: 'c2', phrase: 'benefit from', meaningZh: '从……受益', example: 'We benefit from it.', exampleZh: '我们从中受益。' },
  { id: 'c3', phrase: 'focus on', meaningZh: '专注于', example: 'Focus on study.', exampleZh: '专注学习。' },
  { id: 'c4', phrase: 'lead to', meaningZh: '导致', example: 'It leads to change.', exampleZh: '它导致变化。' },
];

describe('collocation practice', () => {
  it('builds free-response translation and cloze exercises without options', () => {
    expect(buildCollocationRecallExercise(entries[0], () => 0)).toMatchObject({ mode: 'zh-to-en', prompt: '参加', answer: 'take part in' });
    expect(buildCollocationRecallExercise(entries[0], () => 0.4)).toMatchObject({ mode: 'en-to-zh', prompt: 'take part in', answer: '参加' });
    expect(buildCollocationRecallExercise(entries[0], () => 0.9)).toMatchObject({ mode: 'cloze', prompt: 'take part ____', answer: 'in', hint: '参加' });
  });

  it('grades English phrases exactly and accepts the complete Chinese meaning', () => {
    expect(gradeCollocationRecall(buildCollocationRecallExercise(entries[0], () => 0), 'take part in')).toBe(true);
    expect(gradeCollocationRecall(buildCollocationRecallExercise(entries[0], () => 0), 'take part')).toBe(false);
    expect(gradeCollocationRecall(buildCollocationRecallExercise(entries[0], () => 0.4), '参加')).toBe(true);
    expect(gradeCollocationRecall(buildCollocationRecallExercise(entries[0], () => 0.4), '参与')).toBe(true);
    expect(gradeCollocationRecall(buildCollocationRecallExercise(entries[0], () => 0.9), 'in')).toBe(true);
    expect(gradeCollocationRecall(buildCollocationRecallExercise(entries[0], () => 0.9), 'take part in')).toBe(false);
  });

  it('adds new collocations on acquisition days and switches to learned items on review-only days', () => {
    const larger = Array.from({ length: 30 }, (_, index) => ({ ...entries[index % entries.length], id: `c${index}`, phrase: `phrase ${index}` }));
    const states: KnowledgeState[] = [{ id: 'knowledge:c0', itemId: 'c0', status: 'review', favorite: false, updatedAt: '2026-09-20T00:00:00.000Z', nextReviewAt: '2026-12-30T00:00:00.000Z' }];
    const acquisition = buildCollocationWorkload(larger, states, '2026-10-02', '2026-12-12', false);
    const review = buildCollocationWorkload(larger, states, '2026-10-03', '2026-12-12', true);

    expect(acquisition.newEntries.length).toBeGreaterThan(0);
    expect(acquisition.entries.length).toBeGreaterThan(0);
    expect(review.newEntries).toEqual([]);
    expect(review.entries.map((item) => item.id)).toContain('c0');
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
