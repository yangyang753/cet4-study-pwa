import type { Attempt } from './attempt';
import type { StudyKind } from '../features/planner/planDay';

export interface ReviewCard {
  id: string;
  questionId: string;
  stage: number;
  nextReviewAt: string;
  lastCorrect: boolean;
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

export interface UserSettings {
  id: 'current';
  examDate: string;
  dailyMinutes: number;
  playbackRate: number;
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
  updatedAt: new Date(0).toISOString(),
});
