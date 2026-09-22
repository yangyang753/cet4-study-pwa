import { describe, expect, it } from 'vitest';
import { planDay } from './planDay';

const base = { date: '2026-09-22', examDate: '2026-12-12', dailyMinutes: 60, weakSkill: 'listening' as const, unfinished: [] };

describe('planDay', () => {
  it('creates the approved 60-minute foundation plan', () => {
    const plan = planDay(base);
    expect(plan.phase).toBe('foundation');
    expect(plan.tasks.map((task) => [task.kind, task.minutes])).toEqual([
      ['vocabulary', 15], ['listening', 20], ['reading', 20], ['review', 5],
    ]);
    expect(plan.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBe(60);
  });

  it('caps missed-work carryover instead of creating an unlimited backlog', () => {
    const unfinished = Array.from({ length: 12 }, (_, index) => ({ id: `old-${index}`, kind: 'reading' as const, minutes: 20, priority: index }));
    const plan = planDay({ ...base, unfinished });
    expect(plan.tasks).toHaveLength(4);
    expect(plan.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBeLessThanOrEqual(60);
  });

  it('moves into sprint phase within four weeks of the exam', () => {
    expect(planDay({ ...base, date: '2026-11-20' }).phase).toBe('sprint');
  });
});
