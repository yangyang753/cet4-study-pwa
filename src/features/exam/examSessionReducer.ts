import type { ExamSessionRecord } from '../../domain/exam';
import type { ResolvedExam } from './examBlueprint';

export type ExamSessionAction =
  | { type: 'answer'; questionId: string; response: string | string[]; now?: string }
  | { type: 'go-to-section'; sectionIndex: number; now?: string }
  | { type: 'submit'; now?: string };

const toIso = (milliseconds: number) => new Date(milliseconds).toISOString();

export function createExamSession(exam: ResolvedExam, startedAt = new Date().toISOString()): ExamSessionRecord {
  let elapsedMinutes = 0;
  const started = Date.parse(startedAt);
  const sectionDeadlines = exam.sections.map((section) => {
    elapsedMinutes += section.minutes;
    return toIso(started + elapsedMinutes * 60_000);
  });
  return {
    id: `exam:${exam.id}:${started}`,
    mockId: exam.id,
    contentVersion: exam.contentVersion,
    startedAt,
    updatedAt: startedAt,
    sectionDeadlines,
    currentSectionIndex: 0,
    lockedSectionIndexes: [],
    answers: {},
    status: 'active',
  };
}

export function remainingSeconds(session: ExamSessionRecord, now = new Date().toISOString()): number {
  const finalDeadline = session.sectionDeadlines.at(-1);
  if (!finalDeadline || session.status !== 'active') return 0;
  const totalSeconds = Math.ceil((Date.parse(finalDeadline) - Date.parse(session.startedAt)) / 1000);
  return Math.min(totalSeconds, Math.max(0, Math.ceil((Date.parse(finalDeadline) - Date.parse(now)) / 1000)));
}

export function restoreExamSession(session: ExamSessionRecord, exam: ResolvedExam, now = new Date().toISOString()): ExamSessionRecord {
  if (session.status !== 'active') return session;
  if (session.contentVersion !== exam.contentVersion || session.mockId !== exam.id || session.sectionDeadlines.length !== exam.sections.length) {
    return { ...session, status: 'stale', updatedAt: now };
  }
  const currentTime = Date.parse(now);
  const nextSectionIndex = session.sectionDeadlines.findIndex((deadline) => currentTime < Date.parse(deadline));
  if (nextSectionIndex === -1) {
    return { ...session, currentSectionIndex: exam.sections.length - 1, lockedSectionIndexes: exam.sections.slice(0, -1).map((_, index) => index), status: 'submitted', submittedAt: now, updatedAt: now };
  }
  const lockedSectionIndexes = exam.sections.slice(0, nextSectionIndex).map((_, index) => index);
  if (nextSectionIndex === session.currentSectionIndex && lockedSectionIndexes.length === session.lockedSectionIndexes.length) return session;
  return { ...session, currentSectionIndex: nextSectionIndex, lockedSectionIndexes, updatedAt: now };
}

export function reduceExamSession(session: ExamSessionRecord, action: ExamSessionAction): ExamSessionRecord {
  if (session.status !== 'active') return session;
  const now = action.now ?? new Date().toISOString();
  if (action.type === 'answer') return { ...session, answers: { ...session.answers, [action.questionId]: action.response }, updatedAt: now };
  if (action.type === 'go-to-section') {
    if (action.sectionIndex < session.currentSectionIndex || session.lockedSectionIndexes.includes(action.sectionIndex)) return session;
    const lockedSectionIndexes = Array.from({ length: action.sectionIndex }, (_, index) => index);
    return { ...session, currentSectionIndex: action.sectionIndex, lockedSectionIndexes, updatedAt: now };
  }
  return { ...session, status: 'submitted', submittedAt: now, updatedAt: now };
}
