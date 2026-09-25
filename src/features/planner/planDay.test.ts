import { describe, expect, it } from 'vitest';
import { carryoverFromPlan, planDay } from './planDay';

const base = { date: '2026-09-22', examDate: '2026-12-12', dailyMinutes: 60, weakSkill: 'listening' as const, hasRecentEvidence: false, unfinished: [] };

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

  it('expands vocabulary time from the actual workload while keeping the daily total fixed', () => {
    const plan = planDay({ ...base, vocabularyMinutes: 24 });
    expect(plan.tasks[0]).toMatchObject({ kind: 'vocabulary', minutes: 24 });
    expect(plan.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBe(60);
    expect(plan.tasks[1].minutes).toBeGreaterThanOrEqual(15);
    expect(plan.tasks[2].minutes).toBeGreaterThanOrEqual(10);
  });

  it('moves into sprint phase within four weeks of the exam', () => {
    expect(planDay({ ...base, date: '2026-11-20' }).phase).toBe('sprint');
  });

  it('uses a diagnostic weakness during foundation week', () => {
    const plan = planDay({ ...base, diagnosticWeakSkill: 'grammar', hasRecentEvidence: false });
    expect(plan.tasks.some((task) => task.kind === 'grammar')).toBe(true);
  });

  it('rotates foundation work across grammar reading writing and translation', () => {
    const kinds = ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27'].map((date) => planDay({ ...base, date }).tasks[2].kind);
    expect(new Set(kinds)).toEqual(new Set(['grammar', 'reading', 'writing', 'translation']));
  });

  it('prefers recent learning evidence over the earlier diagnostic result', () => {
    const plan = planDay({ ...base, weakSkill: 'writing', diagnosticWeakSkill: 'grammar', hasRecentEvidence: true });
    expect(plan.tasks[2].kind).toBe('writing');
  });

  it('carries yesterday unfinished rotating task without duplicating daily routines', () => {
    const completedTaskIds = new Set([
      '2026-10-19:vocabulary',
      '2026-10-19:listening',
      '2026-10-19:review',
    ]);

    const previousTasks = planDay({ ...base, date: '2026-10-19', weakSkill: 'writing' }).tasks;
    expect(carryoverFromPlan(previousTasks, completedTaskIds)).toEqual([
      { id: '2026-10-19:writing', kind: 'writing', minutes: 20, priority: 2 },
    ]);
  });
});
