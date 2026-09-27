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
    const byId = new Map(questions.map((question) => [question.id, question]));
    const available = new Set(byId.keys());
    if (value.version !== 2 || typeof value.sessionId !== 'string' || typeof value.date !== 'string'
      || !Array.isArray(value.questionIds) || value.questionIds.length === 0 || value.questionIds.some((id) => typeof id !== 'string' || !available.has(id))
      || new Set(value.questionIds).size !== value.questionIds.length
      || !Number.isInteger(value.currentIndex) || value.currentIndex! < 0 || value.currentIndex! >= value.questionIds.length
      || !Array.isArray(value.answers) || typeof value.startedAt !== 'string' || typeof value.updatedAt !== 'string' || !value.kinds) return null;
    const answers = value.answers as Partial<DiagnosticSessionAnswer>[];
    const answerIds = answers.map((answer) => answer.questionId);
    if (answers.length > value.currentIndex! + 1 || new Set(answerIds).size !== answerIds.length || answers.some((answer) => {
      const question = typeof answer.questionId === 'string' ? byId.get(answer.questionId) : undefined;
      const questionIndex = typeof answer.questionId === 'string' ? value.questionIds!.indexOf(answer.questionId) : -1;
      return !question || questionIndex < 0 || questionIndex > value.currentIndex!
        || answer.kind !== diagnosticKind(question) || typeof answer.attemptId !== 'string' || !answer.attemptId
        || typeof answer.correct !== 'boolean' || typeof answer.score !== 'number' || !Number.isFinite(answer.score) || answer.score < 0 || answer.score > 1
        || answer.response === null || answer.response === undefined || (typeof answer.response === 'string' && !answer.response.trim());
    })) return null;
    return value as DiagnosticSessionV2;
  } catch {
    return null;
  }
}
