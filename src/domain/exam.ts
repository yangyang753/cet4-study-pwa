export type ExamSessionStatus = 'active' | 'submitted' | 'stale';

export interface ExamSessionRecord {
  id: string;
  mockId: string;
  contentVersion: string;
  startedAt: string;
  updatedAt: string;
  sectionDeadlines: string[];
  currentSectionIndex: number;
  currentQuestionIndex?: number;
  lockedSectionIndexes: number[];
  playedListeningGroupIds?: string[];
  answers: Record<string, string | string[]>;
  status: ExamSessionStatus;
  submittedAt?: string;
}
