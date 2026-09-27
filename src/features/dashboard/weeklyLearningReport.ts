import type { DashboardSnapshot } from '../../domain/learning';
import { resolveExam } from '../exam/examBlueprint';
import { estimateCetScore } from '../exam/estimateCetScore';
import { normalizeStudyKind, type CoreStudyKind } from './learningEvidence';

export interface WeeklyKindAccuracy { kind: CoreStudyKind; attempts: number; accuracy: number }
export interface WeeklyLearningReport {
  activeDays: number;
  attemptCount: number;
  accuracyByKind: WeeklyKindAccuracy[];
  masteredCount: number;
  lapseCount: number;
  recentMockMinimum: number | null;
  mockSampleCount: number;
  priorities: CoreStudyKind[];
}

const modeWeight = { practice: 1, exam: 1, review: 0.75, mastery: 0.5, diagnostic: 0 } as const;
const localDate = (iso: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export function buildWeeklyLearningReport(snapshot: DashboardSnapshot, today: string): WeeklyLearningReport {
  const start = new Date(`${today}T12:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - 6);
  const startDate = start.toISOString().slice(0, 10);
  const attempts = snapshot.attempts.filter((attempt) => localDate(attempt.createdAt) >= startDate && localDate(attempt.createdAt) <= today);
  const completions = snapshot.completions.filter((completion) => completion.date >= startDate && completion.date <= today);
  const activeDates = new Set([...attempts.map((attempt) => localDate(attempt.createdAt)), ...completions.map((completion) => completion.date)]);
  const groups = new Map<CoreStudyKind, { attempts: number; earned: number; possible: number }>();
  for (const attempt of attempts) {
    const kind = normalizeStudyKind(attempt.kind);
    if (!kind || typeof attempt.correct !== 'boolean') continue;
    const weight = modeWeight[attempt.mode ?? 'practice'];
    if (!weight) continue;
    const group = groups.get(kind) ?? { attempts: 0, earned: 0, possible: 0 };
    group.attempts += 1;
    group.earned += Number(attempt.correct) * weight;
    group.possible += weight;
    groups.set(kind, group);
  }
  const accuracyByKind = [...groups.entries()].map(([kind, value]) => ({
    kind, attempts: value.attempts, accuracy: value.possible ? value.earned / value.possible : 0,
  })).sort((left, right) => left.accuracy - right.accuracy || right.attempts - left.attempts || left.kind.localeCompare(right.kind));
  const sessions = (snapshot.examSessions ?? []).filter((session) => session.status === 'submitted')
    .sort((left, right) => (right.submittedAt ?? right.updatedAt).localeCompare(left.submittedAt ?? left.updatedAt)).slice(0, 3);
  const scores = sessions.flatMap((session) => {
    try { return [estimateCetScore(session, resolveExam(session.mockId)).total]; } catch { return []; }
  });
  return {
    activeDays: activeDates.size,
    attemptCount: attempts.length,
    accuracyByKind,
    masteredCount: snapshot.knowledgeStates.filter((state) => state.status === 'mastered').length,
    lapseCount: snapshot.knowledgeStates.reduce((sum, state) => sum + (state.lapseCount ?? 0), 0),
    recentMockMinimum: scores.length >= 3 ? Math.min(...scores) : null,
    mockSampleCount: scores.length,
    priorities: accuracyByKind.slice(0, 2).map((item) => item.kind),
  };
}
