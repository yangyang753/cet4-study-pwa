export type StudyKind = 'vocabulary' | 'grammar' | 'listening' | 'reading' | 'translation' | 'writing' | 'review' | 'mock';
export type StudyPhase = 'foundation' | 'breakthrough' | 'sprint';
export interface StudyTask { id: string; kind: StudyKind; minutes: number; priority: number }
export interface PlannerInput { date: string; examDate: string; dailyMinutes: number; weakSkill: StudyKind; diagnosticWeakSkill?: StudyKind; hasRecentEvidence: boolean; unfinished: StudyTask[]; vocabularyMinutes?: number }
export interface DailyPlan { date: string; phase: StudyPhase; tasks: StudyTask[] }

function daysBetween(start: string, end: string) {
  return Math.ceil((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}

function rotatingFoundationKind(date: string): StudyKind {
  const kinds: StudyKind[] = ['grammar', 'writing', 'reading', 'translation'];
  const ordinal = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return kinds[((ordinal % kinds.length) + kinds.length) % kinds.length];
}

export function planDay(input: PlannerInput): DailyPlan {
  const remaining = daysBetween(input.date, input.examDate);
  const phase: StudyPhase = remaining <= 28 ? 'sprint' : remaining <= 56 ? 'breakthrough' : 'foundation';
  const evidenceWeakSkill = input.hasRecentEvidence ? input.weakSkill : input.diagnosticWeakSkill;
  const requestedRotating: StudyKind = phase === 'sprint' ? 'mock' : evidenceWeakSkill ?? rotatingFoundationKind(input.date);
  const rotating: StudyKind = ['vocabulary', 'listening', 'review'].includes(requestedRotating) ? 'reading' : requestedRotating;
  const minutes = input.dailyMinutes;
  const defaultVocabularyMinutes = Math.round(minutes * 0.25);
  const maximumVocabularyMinutes = Math.max(defaultVocabularyMinutes, minutes - 30);
  const vocabularyMinutes = Math.min(maximumVocabularyMinutes, Math.max(defaultVocabularyMinutes, input.vocabularyMinutes ?? defaultVocabularyMinutes));
  const listeningMinutes = Math.max(15, Math.min(Math.round(minutes / 3), minutes - vocabularyMinutes - 15));
  const reviewMinutes = Math.max(5, Math.round(minutes / 12));
  const rotatingMinutes = minutes - vocabularyMinutes - listeningMinutes - reviewMinutes;
  const carryover = [...input.unfinished].sort((a, b) => b.priority - a.priority)[0];
  const tasks: StudyTask[] = [
    { id: `${input.date}:vocabulary`, kind: 'vocabulary', minutes: vocabularyMinutes, priority: 3 },
    { id: `${input.date}:listening`, kind: 'listening', minutes: listeningMinutes, priority: 4 },
    carryover ? { ...carryover, minutes: Math.min(rotatingMinutes, carryover.minutes) } : { id: `${input.date}:${rotating}`, kind: rotating, minutes: rotatingMinutes, priority: 2 },
    { id: `${input.date}:review`, kind: 'review', minutes: reviewMinutes, priority: 5 },
  ];
  const total = tasks.reduce((sum, task) => sum + task.minutes, 0);
  if (total < minutes) tasks[2] = { ...tasks[2], minutes: tasks[2].minutes + minutes - total };
  return { date: input.date, phase, tasks };
}

export function carryoverFromPlan(previousTasks: StudyTask[], completedTaskIds: Set<string>): StudyTask[] {
  return previousTasks.filter((task) =>
    !completedTaskIds.has(task.id) && !['vocabulary', 'listening', 'review'].includes(task.kind));
}

export function daysUntil(date: string, examDate: string) { return Math.max(0, daysBetween(date, examDate)); }
