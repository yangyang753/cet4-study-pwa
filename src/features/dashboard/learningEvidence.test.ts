import { describe, expect, it } from 'vitest';
import type { Attempt } from '../../domain/attempt';
import { normalizeStudyKind, selectRecentEvidence } from './learningEvidence';

const attempt = (id: string, kind: string, createdAt: string): Attempt => ({
  id, userId: 'local', questionId: id, response: 'A', correct: false, score: 0,
  durationSeconds: 10, kind, createdAt,
});

describe('learning evidence', () => {
  it('maps raw question kinds to safe learning categories', () => {
    expect(normalizeStudyKind('conversation')).toBe('listening');
    expect(normalizeStudyKind('news')).toBe('listening');
    expect(normalizeStudyKind('cloze')).toBe('reading');
    expect(normalizeStudyKind('unknown-kind')).toBeNull();
  });

  it('keeps at most 30 scored attempts from the recent 14 days', () => {
    const attempts = Array.from({ length: 35 }, (_, index) => attempt(String(index), 'conversation', `2026-09-${String(24 - (index % 10)).padStart(2, '0')}T12:00:00.000Z`));
    attempts.push(attempt('old', 'listening', '2026-08-01T12:00:00.000Z'));
    expect(selectRecentEvidence(attempts, '2026-09-24T12:00:00.000Z')).toHaveLength(30);
    expect(selectRecentEvidence(attempts, '2026-09-24T12:00:00.000Z').every((item) => item.kind === 'listening')).toBe(true);
  });
});
