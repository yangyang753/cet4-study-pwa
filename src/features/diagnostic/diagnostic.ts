import type { CoreStudyKind } from '../dashboard/learningEvidence';

export interface DiagnosticResponse { questionId: string; kind: CoreStudyKind; correct: boolean }
export interface DiagnosticResult { completedAt: string; levels: Partial<Record<CoreStudyKind, number>> }

const diagnosticCategories = ['vocabulary', 'grammar', 'listening', 'reading'] as const satisfies readonly CoreStudyKind[];

export function scoreDiagnostic(responses: DiagnosticResponse[], completedAt = new Date().toISOString()): DiagnosticResult {
  const testedCategories = diagnosticCategories.filter((kind) => responses.some((response) => response.kind === kind));
  const levels = Object.fromEntries(testedCategories.map((kind) => {
    const items = responses.filter((response) => response.kind === kind);
    return [kind, items.filter((item) => item.correct).length / items.length];
  })) as Partial<Record<CoreStudyKind, number>>;
  return { completedAt, levels };
}

export function selectDiagnosticWeakSkill(levels?: Partial<Record<CoreStudyKind, number>>): CoreStudyKind | null {
  if (!levels) return null;
  return diagnosticCategories
    .flatMap((kind) => typeof levels[kind] === 'number' && Number.isFinite(levels[kind]) ? [{ kind, level: levels[kind]! }] : [])
    .sort((left, right) => left.level - right.level)[0]?.kind ?? null;
}
