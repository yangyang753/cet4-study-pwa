import { describe, expect, it } from 'vitest';
import type { Attempt } from '../../domain/attempt';
import { selectListeningSetIndex } from './selectListeningSet';

const sets = [
  { id: 'listen-01', questions: [{ id: 'listen-01:q1' }] },
  { id: 'listen-02', questions: [{ id: 'listen-02:q1' }] },
  { id: 'listen-03', questions: [{ id: 'listen-03:q1' }] },
];

const attempt = (questionId: string, createdAt: string): Attempt => ({
  id: `${questionId}:${createdAt}`, userId: 'local', questionId, response: 'A', correct: true,
  score: 1, durationSeconds: 1, kind: 'listening', mode: 'practice', createdAt,
});

describe('listening set selection', () => {
  it('chooses an unseen set before a previously attempted set', () => {
    expect(selectListeningSetIndex(sets, [attempt('listen-01:q1', '2026-10-04T08:00:00Z')], '2026-10-04')).not.toBe(0);
  });

  it('chooses the least recently used set after every set has history', () => {
    const attempts = [
      attempt('listen-01:q1', '2026-10-04T08:00:00Z'),
      attempt('listen-02:q1', '2026-09-20T08:00:00Z'),
      attempt('listen-03:q1', '2026-10-01T08:00:00Z'),
    ];
    expect(selectListeningSetIndex(sets, attempts, '2026-10-04')).toBe(1);
  });

  it('is deterministic when there is no history', () => {
    expect(selectListeningSetIndex(sets, [], '2026-10-04')).toBe(selectListeningSetIndex(sets, [], '2026-10-04'));
  });
});
