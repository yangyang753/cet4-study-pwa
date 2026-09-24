import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { StudyKind } from '../planner/planDay';

export function localStudyDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export async function completeDailyTask(repository: LearningRepository, kind: StudyKind, date = localStudyDate()) {
  const taskId = `${date}:${kind}`;
  await repository.completeTask({ id: taskId, date, taskId, kind, completedAt: new Date().toISOString() });
  return taskId;
}

export type MasteryOutcome = 'mastered' | 'remediation';

export async function recordMasteryOutcome(repository: LearningRepository, taskId: string, correct: number, total: number, now: string): Promise<MasteryOutcome> {
  const rawKind = taskId.split(':').at(-1) ?? 'review';
  const kind = rawKind as StudyKind;
  const date = taskId.slice(0, 10);
  const outcome: MasteryOutcome = total > 0 && correct / total >= 0.8 ? 'mastered' : 'remediation';
  await repository.completeTask({ id: taskId, date, taskId, kind, completedAt: now });
  await repository.upsertKnowledgeState({
    id: `mastery:${taskId}`,
    itemId: taskId,
    status: outcome === 'mastered' ? 'mastered' : 'review',
    favorite: false,
    updatedAt: now,
  });
  return outcome;
}
