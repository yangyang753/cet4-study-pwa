import type { DashboardSnapshot } from '../domain/learning';
import { daysUntil } from '../features/planner/planDay';

export interface ShellSummary {
  completed: number;
  total: number;
  dueReviews: number;
  daysToExam: number;
  phaseLabel: string;
}

export function deriveShellSummary(snapshot: DashboardSnapshot, today: string): ShellSummary {
  const completedKinds = new Set(snapshot.completions.filter((item) => item.date === today).map((item) => item.kind));
  const daysToExam = daysUntil(today, snapshot.settings.examDate);
  return {
    completed: Math.min(completedKinds.size, 4),
    total: 4,
    dueReviews: snapshot.dueReviews.length,
    daysToExam,
    phaseLabel: daysToExam <= 28 ? '冲刺模拟期' : daysToExam <= 56 ? '题型突破期' : '基础补强期',
  };
}
