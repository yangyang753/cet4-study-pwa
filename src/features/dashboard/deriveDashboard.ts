import type { Attempt } from '../../domain/attempt';
import type { StudyTaskCompletion } from '../../domain/learning';

export interface WeakSkill { kind: string; accuracy: number; attempts: number }
export interface DashboardMetrics { hasEnoughData: boolean; weakSkill: WeakSkill | null; streak: number; completedTaskIds: Set<string> }

function localDate(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function deriveDashboard(attempts: Attempt[], completions: StudyTaskCompletion[], today: string, timeZone = 'Asia/Shanghai'): DashboardMetrics {
  const scored = attempts.filter((attempt) => typeof attempt.correct === 'boolean');
  const groups = new Map<string, { correct: number; total: number }>();
  for (const attempt of scored) {
    const kind = attempt.kind ?? 'other';
    const group = groups.get(kind) ?? { correct: 0, total: 0 };
    group.total += 1;
    group.correct += Number(attempt.correct);
    groups.set(kind, group);
  }
  const hasEnoughData = scored.length >= 5;
  const weakSkill = hasEnoughData ? [...groups.entries()].map(([kind, value]) => ({ kind, accuracy: value.correct / value.total, attempts: value.total })).sort((a, b) => a.accuracy - b.accuracy)[0] ?? null : null;
  const activeDates = new Set([...attempts.map((item) => localDate(item.createdAt, timeZone)), ...completions.map((item) => item.date)]);
  let streak = 0;
  const cursor = new Date(`${today}T12:00:00Z`);
  while (activeDates.has(cursor.toISOString().slice(0, 10))) { streak += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return { hasEnoughData, weakSkill, streak, completedTaskIds: new Set(completions.map((item) => item.taskId)) };
}
