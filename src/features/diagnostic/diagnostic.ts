import type { CoreStudyKind } from '../dashboard/learningEvidence';

export interface DiagnosticResponse { questionId: string; kind: CoreStudyKind; correct: boolean }
export interface DiagnosticResult { completedAt: string; levels: Record<CoreStudyKind, number> }

const categories: CoreStudyKind[] = ['vocabulary', 'grammar', 'listening', 'reading', 'writing', 'translation'];

export function scoreDiagnostic(responses: DiagnosticResponse[], completedAt = new Date().toISOString()): DiagnosticResult {
  const levels = Object.fromEntries(categories.map((kind) => {
    const items = responses.filter((response) => response.kind === kind);
    return [kind, items.length ? items.filter((item) => item.correct).length / items.length : 0];
  })) as Record<CoreStudyKind, number>;
  return { completedAt, levels };
}
