import type { CatalogQuestion } from '../../domain/content';
import type { CoreStudyKind } from '../dashboard/learningEvidence';

export const DIAGNOSTIC_SESSION_KEY = 'cet4:diagnostic-session:v2';

export interface DiagnosticSessionAnswer {
  questionId: string;
  kind: CoreStudyKind;
  response: unknown;
  correct: boolean;
  score: number;
  attemptId: string;
}

export interface DiagnosticSessionV2 {
  version: 2;
  sessionId: string;
  date: string;
  questionIds: string[];
  kinds: Record<CoreStudyKind, number>;
  currentIndex: number;
  answers: DiagnosticSessionAnswer[];
  startedAt: string;
  updatedAt: string;
}

const standardCounts: Record<CoreStudyKind, number> = {
  vocabulary: 3, grammar: 3, listening: 6, reading: 6, writing: 1, translation: 1,
};

export function diagnosticKind(question: CatalogQuestion): CoreStudyKind {
  if (question.type === 'vocabulary' || question.type === 'grammar' || question.type === 'writing' || question.type === 'translation') return question.type;
  if (question.type === 'news' || question.type === 'conversation' || question.type === 'passage') return 'listening';
  return 'reading';
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

export function createDiagnosticSession(
  questions: CatalogQuestion[], sessionId: string, date: string, now: string,
): DiagnosticSessionV2 {
  const selected = (Object.keys(standardCounts) as CoreStudyKind[]).flatMap((kind) => {
    const candidates = questions
      .filter((question) => diagnosticKind(question) === kind)
      .sort((left, right) => stableHash(`${sessionId}:${date}:${left.id}`) - stableHash(`${sessionId}:${date}:${right.id}`) || left.id.localeCompare(right.id));
    if (candidates.length < standardCounts[kind]) throw new Error(`诊断题库不足：${kind}`);
    return candidates.slice(0, standardCounts[kind]);
  });
  return {
    version: 2, sessionId, date, questionIds: selected.map((question) => question.id), kinds: { ...standardCounts },
    currentIndex: 0, answers: [], startedAt: now, updatedAt: now,
  };
}

export function restoreDiagnosticSession(raw: string | null, questions: CatalogQuestion[]): DiagnosticSessionV2 | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<DiagnosticSessionV2>;
    const available = new Set(questions.map((question) => question.id));
    if (value.version !== 2 || typeof value.sessionId !== 'string' || typeof value.date !== 'string'
      || !Array.isArray(value.questionIds) || value.questionIds.length === 0 || value.questionIds.some((id) => typeof id !== 'string' || !available.has(id))
      || !Number.isInteger(value.currentIndex) || value.currentIndex! < 0 || value.currentIndex! >= value.questionIds.length
      || !Array.isArray(value.answers) || typeof value.startedAt !== 'string' || typeof value.updatedAt !== 'string' || !value.kinds) return null;
    return value as DiagnosticSessionV2;
  } catch {
    return null;
  }
}
