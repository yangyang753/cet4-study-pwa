import type { ExamSessionRecord } from '../../domain/exam';
import type { ResolvedExam } from './examBlueprint';

export type ExamSessionAction =
  | { type: 'answer'; questionId: string; response: string | string[]; now?: string }
  | { type: 'go-to-question'; questionIndex: number; now?: string }
  | { type: 'mark-listening-played'; groupId: string; now?: string }
  | { type: 'go-to-section'; sectionIndex: number; now?: string }
  | { type: 'submit'; now?: string };

const toIso = (milliseconds: number) => new Date(milliseconds).toISOString();

export function createExamSession(exam: ResolvedExam, startedAt = new Date().toISOString()): ExamSessionRecord {
  let elapsedMinutes = 0;
  const started = Date.parse(startedAt);
  const sectionDeadlines = exam.sections.map((section, index) => {
    const followsSharedReading = section.kind === 'translation' && exam.sections[index - 1]?.kind === 'reading';
    if (!followsSharedReading) {
      elapsedMinutes += section.minutes;
      if (section.kind === 'reading' && exam.sections[index + 1]?.kind === 'translation') elapsedMinutes += exam.sections[index + 1].minutes;
    }
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
    currentQuestionIndex: 0,
    lockedSectionIndexes: [],
    playedListeningGroupIds: [],
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
  const firstAvailableIndex = session.sectionDeadlines.findIndex((deadline) => currentTime < Date.parse(deadline));
  if (firstAvailableIndex === -1) {
    return { ...session, currentSectionIndex: exam.sections.length - 1, currentQuestionIndex: 0, lockedSectionIndexes: exam.sections.slice(0, -1).map((_, index) => index), status: 'submitted', submittedAt: now, updatedAt: now };
  }
  const lockedSectionIndexes = session.sectionDeadlines.flatMap((deadline, index) => currentTime >= Date.parse(deadline) ? [index] : []);
  const currentStillAvailable = !lockedSectionIndexes.includes(session.currentSectionIndex);
  const nextSectionIndex = currentStillAvailable ? session.currentSectionIndex : firstAvailableIndex;
  if (nextSectionIndex === session.currentSectionIndex && lockedSectionIndexes.length === session.lockedSectionIndexes.length) return session;
  return { ...session, currentSectionIndex: nextSectionIndex, currentQuestionIndex: nextSectionIndex === session.currentSectionIndex ? (session.currentQuestionIndex ?? 0) : 0, lockedSectionIndexes, updatedAt: now };
}

export function reduceExamSession(session: ExamSessionRecord, action: ExamSessionAction): ExamSessionRecord {
  if (session.status !== 'active') return session;
  const now = action.now ?? new Date().toISOString();
  if (action.type === 'answer') return { ...session, answers: { ...session.answers, [action.questionId]: action.response }, updatedAt: now };
  if (action.type === 'go-to-question') return { ...session, currentQuestionIndex: Math.max(0, action.questionIndex), updatedAt: now };
  if (action.type === 'mark-listening-played') {
    const playedListeningGroupIds = session.playedListeningGroupIds ?? [];
    return playedListeningGroupIds.includes(action.groupId)
      ? session
      : { ...session, playedListeningGroupIds: [...playedListeningGroupIds, action.groupId], updatedAt: now };
  }
  if (action.type === 'go-to-section') {
    if (session.lockedSectionIndexes.includes(action.sectionIndex) || !session.sectionDeadlines[action.sectionIndex]) return session;
    const targetDeadline = Date.parse(session.sectionDeadlines[action.sectionIndex]);
    const currentDeadline = Date.parse(session.sectionDeadlines[session.currentSectionIndex]);
    if (action.sectionIndex < session.currentSectionIndex && targetDeadline !== currentDeadline) return session;
    const lockedSectionIndexes = session.sectionDeadlines.flatMap((deadline, index) => Date.parse(deadline) < targetDeadline ? [index] : []);
    return { ...session, currentSectionIndex: action.sectionIndex, currentQuestionIndex: 0, lockedSectionIndexes, updatedAt: now };
  }
  return { ...session, status: 'submitted', submittedAt: now, updatedAt: now };
}
