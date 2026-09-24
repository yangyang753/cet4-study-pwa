import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { StudyKind } from '../planner/planDay';
import { studyDate } from '../../lib/studyDate';

export const localStudyDate = studyDate;

export async function completeDailyTask(repository: LearningRepository, kind: StudyKind, date = localStudyDate()) {
  const taskId = `${date}:${kind}`;
  await repository.completeTask({ id: taskId, date, taskId, kind, completedAt: new Date().toISOString() });
  return taskId;
}

export type MasteryOutcome = 'mastered' | 'remediation';
const supportedKinds: StudyKind[] = ['vocabulary', 'grammar', 'listening', 'reading', 'translation', 'writing', 'review', 'mock'];

export async function recordMasteryOutcome(repository: LearningRepository, taskId: string, correct: number, total: number, now: string): Promise<MasteryOutcome> {
  const rawKind = taskId.split(':').at(-1) ?? 'review';
  const kind: StudyKind = supportedKinds.includes(rawKind as StudyKind) ? rawKind as StudyKind : 'review';
  const date = /^\d{4}-\d{2}-\d{2}:/.test(taskId) ? taskId.slice(0, 10) : localStudyDate(new Date(now));
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
