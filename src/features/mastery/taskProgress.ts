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
