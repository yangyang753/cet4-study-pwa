import type { Attempt } from './attempt';
import type { MistakeReason } from './attempt';
import type { StudyKind } from '../features/planner/planDay';
import type { CoreStudyKind } from '../features/dashboard/learningEvidence';

export interface ReviewCard {
  id: string;
  questionId: string;
  stage: number;
  nextReviewAt: string;
  lastCorrect: boolean;
  priority?: number;
  reason?: MistakeReason;
  updatedAt: string;
}

export interface StudyTaskCompletion {
  id: string;
  date: string;
  taskId: string;
  kind: StudyKind;
  completedAt: string;
}

export interface KnowledgeState {
  id: string;
  itemId: string;
  status: 'learning' | 'review' | 'mastered';
  favorite: boolean;
  updatedAt: string;
}

export interface ExamReadinessState {
  registrationConfirmed: boolean;
  admissionTicketPrepared: boolean;
  equipmentPrepared: boolean;
}

export interface UserSettings {
  id: 'current';
  examDate: string;
  dailyMinutes: number;
  playbackRate: number;
  readiness?: ExamReadinessState;
  diagnosticCompletedAt?: string;
  diagnosticLevels?: Partial<Record<CoreStudyKind, number>>;
  updatedAt: string;
}

export interface DashboardSnapshot {
  attempts: Attempt[];
  dueReviews: ReviewCard[];
  completions: StudyTaskCompletion[];
  knowledgeStates: KnowledgeState[];
  settings: UserSettings;
}

export const defaultUserSettings = (): UserSettings => ({
  id: 'current',
  examDate: '2026-12-12',
  dailyMinutes: 60,
  playbackRate: 1,
  readiness: {
    registrationConfirmed: false,
    admissionTicketPrepared: false,
    equipmentPrepared: false,
  },
  updatedAt: new Date(0).toISOString(),
});

export function normalizeUserSettings(settings?: Partial<UserSettings>): UserSettings {
  const defaults = defaultUserSettings();
  return {
    ...defaults,
    ...settings,
    id: 'current',
    readiness: { ...defaults.readiness!, ...settings?.readiness },
  };
}
