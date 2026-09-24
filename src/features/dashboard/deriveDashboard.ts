import type { Attempt } from '../../domain/attempt';
import type { StudyTaskCompletion } from '../../domain/learning';
import { selectRecentEvidence, type CoreStudyKind } from './learningEvidence';

export interface WeakSkill { kind: CoreStudyKind; accuracy: number; attempts: number }
export interface DashboardMetrics { hasEnoughData: boolean; weakSkill: WeakSkill | null; streak: number; completedTaskIds: Set<string> }

function localDate(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function deriveDashboard(attempts: Attempt[], completions: StudyTaskCompletion[], today: string, timeZone = 'Asia/Shanghai'): DashboardMetrics {
  const evidence = selectRecentEvidence(attempts, `${today}T23:59:59.999Z`);
  const groups = new Map<CoreStudyKind, { correct: number; totalWeight: number; attempts: number }>();
  for (const item of evidence) {
    const group = groups.get(item.kind) ?? { correct: 0, totalWeight: 0, attempts: 0 };
    group.totalWeight += item.weight;
    group.correct += Number(item.correct) * item.weight;
    group.attempts += 1;
    groups.set(item.kind, group);
  }
  const hasEnoughData = evidence.length >= 5;
  const weakSkill = hasEnoughData ? [...groups.entries()].map(([kind, value]) => ({ kind, accuracy: value.correct / value.totalWeight, attempts: value.attempts })).sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)[0] ?? null : null;
  const activeDates = new Set([...attempts.map((item) => localDate(item.createdAt, timeZone)), ...completions.map((item) => item.date)]);
  let streak = 0;
  const cursor = new Date(`${today}T12:00:00Z`);
  while (activeDates.has(cursor.toISOString().slice(0, 10))) { streak += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return { hasEnoughData, weakSkill, streak, completedTaskIds: new Set(completions.map((item) => item.taskId)) };
}
