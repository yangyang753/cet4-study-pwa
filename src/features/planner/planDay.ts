import type { LearningPriority } from '../diagnostic/adaptivePriorities';

export type StudyKind = 'foundation-vocabulary' | 'vocabulary' | 'culture' | 'collocation' | 'grammar' | 'listening' | 'reading' | 'translation' | 'writing' | 'review' | 'mock';
export type StudyPhase = 'foundation' | 'breakthrough' | 'sprint';
export interface StudyTask { id: string; kind: StudyKind; minutes: number; priority: number }
export interface PlannerInput { date: string; examDate: string; dailyMinutes: number; weakSkill: StudyKind; diagnosticWeakSkill?: StudyKind; hasRecentEvidence: boolean; unfinished: StudyTask[]; vocabularyMinutes?: number; priorities?: LearningPriority[] }
export interface DailyPlan { date: string; phase: StudyPhase; tasks: StudyTask[] }

function daysBetween(start: string, end: string) {
  return Math.ceil((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}

function rotatingFoundationKind(date: string): StudyKind {
  const kinds: StudyKind[] = ['collocation', 'writing', 'reading', 'translation'];
  const ordinal = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return kinds[((ordinal % kinds.length) + kinds.length) % kinds.length];
}

export function planDay(input: PlannerInput): DailyPlan {
  const remaining = daysBetween(input.date, input.examDate);
  const phase: StudyPhase = remaining <= 28 ? 'sprint' : remaining <= 56 ? 'breakthrough' : 'foundation';
  const priorityKinds = input.priorities?.map((item) => item.kind) ?? [];
  const nonCorePriorities = priorityKinds.filter((kind) => kind !== 'vocabulary' && kind !== 'listening');
  const evidenceWeakSkill = input.hasRecentEvidence ? input.weakSkill : input.diagnosticWeakSkill;
  const priorityOrdinal = Math.floor(Date.parse(`${input.date}T00:00:00Z`) / 86_400_000);
  const priorityRotating = nonCorePriorities.length ? nonCorePriorities[((priorityOrdinal % nonCorePriorities.length) + nonCorePriorities.length) % nonCorePriorities.length] : undefined;
  const fullMockDay = phase === 'sprint' && new Date(`${input.date}T00:00:00Z`).getUTCDay() === 0;
  if (fullMockDay) return { date: input.date, phase, tasks: [{ id: `${input.date}:mock`, kind: 'mock', minutes: 125, priority: 6 }] };
  const requested = priorityRotating ?? evidenceWeakSkill ?? rotatingFoundationKind(input.date);
  const requestedRotating: StudyKind = requested === 'grammar' ? 'collocation' : requested;
  const rotating: StudyKind = ['vocabulary', 'culture', 'listening', 'review'].includes(requestedRotating) ? 'reading' : requestedRotating;
  const minutes = Math.max(20, input.dailyMinutes);
  const reviewMinutes = Math.min(5, minutes);
  const cultureMinutes = Math.min(10, Math.max(5, minutes >= 45 ? 10 : Math.round(minutes * 0.15)));
  const minimumListeningMinutes = Math.min(minutes - reviewMinutes - cultureMinutes, minutes >= 45 ? 15 : minutes >= 30 ? 5 : 0);
  const minimumRotatingMinutes = minutes >= 30 ? 5 : 0;
  const defaultVocabularyMinutes = Math.max(10, Math.round(minutes * 0.25)) + (priorityKinds.includes('vocabulary') ? 5 : 0);
  const maximumVocabularyMinutes = Math.max(10, minutes - reviewMinutes - cultureMinutes - minimumListeningMinutes - minimumRotatingMinutes);
  const vocabularyMinutes = Math.min(maximumVocabularyMinutes, Math.max(defaultVocabularyMinutes, input.vocabularyMinutes ?? defaultVocabularyMinutes));
  const maximumListeningMinutes = minutes - vocabularyMinutes - cultureMinutes - reviewMinutes - minimumRotatingMinutes;
  const listeningMinutes = Math.min(maximumListeningMinutes, Math.max(minimumListeningMinutes, Math.round(minutes / 3) + (priorityKinds.includes('listening') ? 5 : 0)));
  const rotatingMinutes = minutes - vocabularyMinutes - cultureMinutes - listeningMinutes - reviewMinutes;
  const foundationVocabularyMinutes = Math.max(5, Math.floor(vocabularyMinutes * 0.45));
  const coreVocabularyMinutes = vocabularyMinutes - foundationVocabularyMinutes;
  const savedCarryover = [...input.unfinished].sort((a, b) => b.priority - a.priority)[0];
  const carryover: StudyTask | undefined = savedCarryover?.kind === 'grammar'
    ? { ...savedCarryover, id: `${input.date}:collocation`, kind: 'collocation' }
    : savedCarryover;
  const tasks: StudyTask[] = [
    { id: `${input.date}:foundation-vocabulary`, kind: 'foundation-vocabulary', minutes: foundationVocabularyMinutes, priority: 4 },
    { id: `${input.date}:vocabulary`, kind: 'vocabulary', minutes: coreVocabularyMinutes, priority: 3 },
    { id: `${input.date}:culture`, kind: 'culture', minutes: cultureMinutes, priority: 4 },
  ];
  if (listeningMinutes > 0) tasks.push({ id: `${input.date}:listening`, kind: 'listening', minutes: listeningMinutes, priority: 4 });
  if (rotatingMinutes >= 5) tasks.push(carryover && priorityKinds.length === 0 ? { ...carryover, minutes: Math.min(rotatingMinutes, carryover.minutes) } : { id: `${input.date}:${rotating}`, kind: rotating, minutes: rotatingMinutes, priority: 2 });
  else if (rotatingMinutes > 0) tasks[1] = { ...tasks[1], minutes: tasks[1].minutes + rotatingMinutes };
  tasks.push({ id: `${input.date}:review`, kind: 'review', minutes: reviewMinutes, priority: 5 });
  const total = tasks.reduce((sum, task) => sum + task.minutes, 0);
  if (total < minutes) {
    const targetIndex = tasks.findIndex((task) => !['foundation-vocabulary', 'vocabulary', 'culture', 'listening', 'review'].includes(task.kind));
    const index = targetIndex >= 0 ? targetIndex : tasks.findIndex((task) => task.kind === 'vocabulary');
    tasks[index] = { ...tasks[index], minutes: tasks[index].minutes + minutes - total };
  }
  return { date: input.date, phase, tasks };
}

export function carryoverFromPlan(previousTasks: StudyTask[], completedTaskIds: Set<string>): StudyTask[] {
  return previousTasks.filter((task) =>
    !completedTaskIds.has(task.id) && !['foundation-vocabulary', 'vocabulary', 'culture', 'listening', 'review', 'mock'].includes(task.kind));
}

export function daysUntil(date: string, examDate: string) { return Math.max(0, daysBetween(date, examDate)); }
