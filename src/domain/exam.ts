export type ExamSessionStatus = 'active' | 'submitted' | 'stale';

export interface ExamSessionRecord {
  id: string;
  mockId: string;
  contentVersion: string;
  startedAt: string;
  updatedAt: string;
  sectionDeadlines: string[];
  currentSectionIndex: number;
  lockedSectionIndexes: number[];
  answers: Record<string, string | string[]>;
  status: ExamSessionStatus;
  submittedAt?: string;
}
