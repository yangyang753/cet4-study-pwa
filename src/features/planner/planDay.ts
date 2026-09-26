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
  const reviewMinutes = Math.min(5, minutes);
  const minimumListeningMinutes = Math.min(minutes - reviewMinutes, minutes >= 45 ? 15 : Math.max(5, Math.round(minutes * 0.35)));
  const minimumRotatingMinutes = minutes >= 30 ? 5 : 0;
  const defaultVocabularyMinutes = Math.max(5, Math.round(minutes * 0.25));
  const maximumVocabularyMinutes = Math.max(0, minutes - reviewMinutes - minimumListeningMinutes - minimumRotatingMinutes);
  const vocabularyMinutes = Math.min(maximumVocabularyMinutes, Math.max(defaultVocabularyMinutes, input.vocabularyMinutes ?? defaultVocabularyMinutes));
  const maximumListeningMinutes = minutes - vocabularyMinutes - reviewMinutes - minimumRotatingMinutes;
  const listeningMinutes = Math.min(maximumListeningMinutes, Math.max(minimumListeningMinutes, Math.round(minutes / 3)));
  const rotatingMinutes = minutes - vocabularyMinutes - listeningMinutes - reviewMinutes;
  const carryover = [...input.unfinished].sort((a, b) => b.priority - a.priority)[0];
  const tasks: StudyTask[] = [
    { id: `${input.date}:vocabulary`, kind: 'vocabulary', minutes: vocabularyMinutes, priority: 3 },
    { id: `${input.date}:listening`, kind: 'listening', minutes: listeningMinutes, priority: 4 },
  ];
  if (rotatingMinutes >= 5) tasks.push(carryover ? { ...carryover, minutes: Math.min(rotatingMinutes, carryover.minutes) } : { id: `${input.date}:${rotating}`, kind: rotating, minutes: rotatingMinutes, priority: 2 });
  else tasks[1] = { ...tasks[1], minutes: tasks[1].minutes + rotatingMinutes };
  tasks.push({ id: `${input.date}:review`, kind: 'review', minutes: reviewMinutes, priority: 5 });
  const total = tasks.reduce((sum, task) => sum + task.minutes, 0);
  if (total < minutes) {
    const targetIndex = tasks.findIndex((task) => !['vocabulary', 'listening', 'review'].includes(task.kind));
    const index = targetIndex >= 0 ? targetIndex : 1;
    tasks[index] = { ...tasks[index], minutes: tasks[index].minutes + minutes - total };
  }
  return { date: input.date, phase, tasks };
}

export function carryoverFromPlan(previousTasks: StudyTask[], completedTaskIds: Set<string>): StudyTask[] {
  return previousTasks.filter((task) =>
    !completedTaskIds.has(task.id) && !['vocabulary', 'listening', 'review'].includes(task.kind));
}

export function daysUntil(date: string, examDate: string) { return Math.max(0, daysBetween(date, examDate)); }
