import { describe, expect, it } from 'vitest';
import { carryoverFromPlan, planDay } from './planDay';

const base = { date: '2026-09-22', examDate: '2026-12-12', dailyMinutes: 60, weakSkill: 'listening' as const, hasRecentEvidence: false, unfinished: [] };

describe('planDay', () => {
  it('creates the approved 60-minute foundation plan', () => {
    const plan = planDay(base);
    expect(plan.phase).toBe('foundation');
    expect(plan.tasks.map((task) => [task.kind, task.minutes])).toEqual([
      ['vocabulary', 15], ['culture', 10], ['listening', 20], ['reading', 10], ['review', 5],
    ]);
    expect(plan.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBe(60);
  });

  it('caps missed-work carryover instead of creating an unlimited backlog', () => {
    const unfinished = Array.from({ length: 12 }, (_, index) => ({ id: `old-${index}`, kind: 'reading' as const, minutes: 20, priority: index }));
    const plan = planDay({ ...base, unfinished });
    expect(plan.tasks).toHaveLength(5);
    expect(plan.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBeLessThanOrEqual(60);
  });

  it('expands vocabulary time from the actual workload while keeping the daily total fixed', () => {
    const plan = planDay({ ...base, vocabularyMinutes: 24 });
    expect(plan.tasks[0]).toMatchObject({ kind: 'vocabulary', minutes: 24 });
    expect(plan.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBe(60);
    expect(plan.tasks.find((task) => task.kind === 'listening')?.minutes).toBeGreaterThanOrEqual(15);
    expect(plan.tasks.find((task) => task.kind === 'culture')?.minutes).toBeGreaterThanOrEqual(5);
  });

  it.each([20, 30, 60, 180])('never creates negative time inside a %i-minute budget', (dailyMinutes) => {
    const plan = planDay({ ...base, dailyMinutes, vocabularyMinutes: 35 });
    expect(plan.tasks.every((task) => task.minutes > 0)).toBe(true);
    expect(plan.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBe(dailyMinutes);
  });

  it('drops the rotating task when a short plan cannot give it meaningful time', () => {
    const plan = planDay({ ...base, dailyMinutes: 20 });
    expect(plan.tasks.map((task) => task.kind)).toEqual(['vocabulary', 'culture', 'listening', 'review']);
  });

  it('moves into sprint phase within four weeks of the exam', () => {
    expect(planDay({ ...base, date: '2026-11-20' }).phase).toBe('sprint');
  });

  it('keeps sprint weekdays inside the configured 60-minute budget without a full mock', () => {
    const plan = planDay({ ...base, date: '2026-11-20', dailyMinutes: 60, weakSkill: 'reading', hasRecentEvidence: true });
    expect(plan.phase).toBe('sprint');
    expect(plan.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBe(60);
    expect(plan.tasks.some((task) => task.kind === 'mock')).toBe(false);
    expect(plan.tasks.some((task) => task.kind === 'reading')).toBe(true);
  });

  it('reserves Sunday in sprint phase for one explicit 125-minute full mock', () => {
    const plan = planDay({ ...base, date: '2026-11-22', dailyMinutes: 60 });
    expect(plan.phase).toBe('sprint');
    expect(plan.tasks).toEqual([{ id: '2026-11-22:mock', kind: 'mock', minutes: 125, priority: 6 }]);
  });

  it('does not carry a missed full mock into the next 60-minute day', () => {
    expect(carryoverFromPlan([{ id: 'sunday:mock', kind: 'mock', minutes: 125, priority: 6 }], new Set())).toEqual([]);
  });

  it('uses a collocation task instead of a diagnostic grammar slot', () => {
    const plan = planDay({ ...base, diagnosticWeakSkill: 'grammar', hasRecentEvidence: false });
    expect(plan.tasks.some((task) => task.kind === 'collocation')).toBe(true);
    expect(plan.tasks.some((task) => task.kind === 'grammar')).toBe(false);
  });

  it('normalizes invalid legacy time settings without creating negative tasks', () => {
    const plan = planDay({ ...base, dailyMinutes: 10 });
    expect(plan.tasks.every((task) => task.minutes > 0)).toBe(true);
    expect(plan.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBe(20);
  });

  it('rotates foundation work across collocations reading writing and translation', () => {
    const kinds = ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27'].map((date) => planDay({ ...base, date }).tasks[3].kind);
    expect(new Set(kinds)).toEqual(new Set(['collocation', 'reading', 'writing', 'translation']));
  });

  it('prefers recent learning evidence over the earlier diagnostic result', () => {
    const plan = planDay({ ...base, weakSkill: 'writing', diagnosticWeakSkill: 'grammar', hasRecentEvidence: true });
    expect(plan.tasks[3].kind).toBe('writing');
  });

  it('carries yesterday unfinished rotating task without duplicating daily routines', () => {
    const completedTaskIds = new Set([
      '2026-10-19:vocabulary',
      '2026-10-19:listening',
      '2026-10-19:review',
    ]);

    const previousTasks = planDay({ ...base, date: '2026-10-19', weakSkill: 'writing' }).tasks;
    expect(carryoverFromPlan(previousTasks, completedTaskIds)).toEqual([
      { id: '2026-10-19:writing', kind: 'writing', minutes: 10, priority: 2 },
    ]);
  });

  it('converts a saved unfinished grammar task into collocation practice', () => {
    const plan = planDay({
      ...base,
      unfinished: [{ id: '2026-09-21:grammar', kind: 'grammar', minutes: 10, priority: 9 }],
    });
    expect(plan.tasks.some((task) => task.kind === 'grammar')).toBe(false);
    expect(plan.tasks).toContainEqual(expect.objectContaining({ id: '2026-09-22:collocation', kind: 'collocation' }));
  });

  it('moves five minutes into vocabulary when diagnosis identifies vocabulary weakness', () => {
    const plan = planDay({ ...base, priorities: [{ kind: 'vocabulary', level: 0.2, source: 'diagnostic', attempts: 0 }] });
    expect(plan.tasks.find((task) => task.kind === 'vocabulary')?.minutes).toBe(20);
    expect(plan.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBe(60);
  });

  it('moves five minutes into listening when recent evidence identifies listening weakness', () => {
    const plan = planDay({ ...base, priorities: [{ kind: 'listening', level: 0.2, source: 'recent', attempts: 3 }] });
    expect(plan.tasks.find((task) => task.kind === 'listening')?.minutes).toBe(25);
    expect(plan.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBe(60);
  });

  it('uses and rotates two non-core measured weaknesses instead of stale carryover', () => {
    const priorities = [
      { kind: 'writing' as const, level: 0.2, source: 'diagnostic' as const, attempts: 0 },
      { kind: 'grammar' as const, level: 0.3, source: 'diagnostic' as const, attempts: 0 },
    ];
    const unfinished = [{ id: 'old-reading', kind: 'reading' as const, minutes: 20, priority: 10 }];
    const kinds = ['2026-09-26', '2026-09-27'].map((date) => planDay({ ...base, date, priorities, unfinished }).tasks[3].kind);
    expect(new Set(kinds)).toEqual(new Set(['writing', 'collocation']));
    expect(kinds).not.toContain('reading');
  });

  it('keeps short adaptive plans positive and exactly inside the budget', () => {
    const plan = planDay({ ...base, dailyMinutes: 20, priorities: [
      { kind: 'vocabulary', level: 0.1, source: 'diagnostic', attempts: 0 },
      { kind: 'listening', level: 0.2, source: 'diagnostic', attempts: 0 },
    ] });
    expect(plan.tasks.map((task) => task.kind)).toEqual(['vocabulary', 'culture', 'listening', 'review']);
    expect(plan.tasks.every((task) => task.minutes >= 5)).toBe(true);
    expect(plan.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBe(20);
  });
});
