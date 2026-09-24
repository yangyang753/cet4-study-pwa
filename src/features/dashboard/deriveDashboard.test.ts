import { describe, expect, it } from 'vitest';
import type { Attempt } from '../../domain/attempt';
import { deriveDashboard } from './deriveDashboard';

const attempt = (id: string, kind: string, correct: boolean, createdAt: string): Attempt => ({ id, userId: 'local', questionId: id, response: 'A', correct, score: correct ? 1 : 0, durationSeconds: 10, kind, createdAt });

describe('deriveDashboard', () => {
  it('withholds weak-skill percentages until five attempts exist', () => {
    expect(deriveDashboard([], [], '2026-09-23')).toMatchObject({ hasEnoughData: false, weakSkill: null, streak: 0 });
  });

  it('finds the lowest-accuracy skill from real attempts', () => {
    const attempts = [
      attempt('1', 'listening', false, '2026-09-23T01:00:00.000Z'),
      attempt('2', 'listening', false, '2026-09-23T02:00:00.000Z'),
      attempt('3', 'reading', true, '2026-09-23T03:00:00.000Z'),
      attempt('4', 'reading', true, '2026-09-23T04:00:00.000Z'),
      attempt('5', 'reading', false, '2026-09-23T05:00:00.000Z'),
    ];
    expect(deriveDashboard(attempts, [], '2026-09-23').weakSkill).toMatchObject({ kind: 'listening', accuracy: 0 });
  });

  it('counts UTC timestamps on the learner local calendar day', () => {
    const attempts = [attempt('1', 'listening', true, '2026-09-22T16:30:00.000Z')];
    expect(deriveDashboard(attempts, [], '2026-09-23', 'Asia/Shanghai').streak).toBe(1);
  });

  it('ignores old failures when recent evidence identifies a different weakness', () => {
    const attempts = [
      ...Array.from({ length: 8 }, (_, index) => attempt(`old-${index}`, 'grammar', false, `2026-08-0${index + 1}T01:00:00.000Z`)),
      ...Array.from({ length: 5 }, (_, index) => attempt(`recent-${index}`, 'conversation', false, `2026-09-2${index}T01:00:00.000Z`)),
      ...Array.from({ length: 5 }, (_, index) => attempt(`read-${index}`, 'reading', true, `2026-09-2${index}T02:00:00.000Z`)),
    ];
    expect(deriveDashboard(attempts, [], '2026-09-24').weakSkill?.kind).toBe('listening');
  });

  it('withholds a weakness when only four normalized attempts exist', () => {
    const attempts = Array.from({ length: 4 }, (_, index) => attempt(String(index), 'conversation', false, `2026-09-2${index}T01:00:00.000Z`));
    expect(deriveDashboard(attempts, [], '2026-09-24')).toMatchObject({ hasEnoughData: false, weakSkill: null });
  });
});
