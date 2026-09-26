import type { CoreStudyKind } from '../dashboard/learningEvidence';
import type { DiagnosticProfileV2, DiagnosticSectionScores } from '../../domain/learning';

export interface DiagnosticResponse { questionId: string; kind: CoreStudyKind; correct?: boolean; score?: number }
export type DiagnosticResult = DiagnosticProfileV2;

const legacyDiagnosticCategories = ['vocabulary', 'grammar', 'listening', 'reading'] as const satisfies readonly CoreStudyKind[];
const diagnosticCategories = ['vocabulary', 'grammar', 'listening', 'reading', 'writing', 'translation'] as const satisfies readonly CoreStudyKind[];
const sectionWeights: DiagnosticSectionScores = { writing: 106.5, listening: 248.5, reading: 248.5, translation: 106.5 };
const rounded = (value: number) => Math.round(value * 10) / 10;
const bounded = (value: number) => Math.max(0, Math.min(710, value));
const responseScore = (response: DiagnosticResponse) => Math.max(0, Math.min(1, response.score ?? Number(response.correct)));

export function rankDiagnosticWeakSkills(levels: Partial<Record<CoreStudyKind, number>>): CoreStudyKind[] {
  return diagnosticCategories
    .flatMap((kind) => typeof levels[kind] === 'number' && Number.isFinite(levels[kind]) ? [{ kind, level: levels[kind]! }] : [])
    .sort((left, right) => left.level - right.level || diagnosticCategories.indexOf(left.kind) - diagnosticCategories.indexOf(right.kind))
    .slice(0, 2)
    .map((item) => item.kind);
}

export function scoreDiagnostic(responses: DiagnosticResponse[], completedAt = new Date().toISOString(), sessionId = 'legacy'): DiagnosticResult {
  const testedCategories = diagnosticCategories.filter((kind) => responses.some((response) => response.kind === kind));
  const levels = Object.fromEntries(testedCategories.map((kind) => {
    const items = responses.filter((response) => response.kind === kind);
    return [kind, items.reduce((sum, item) => sum + responseScore(item), 0) / items.length];
  })) as Partial<Record<CoreStudyKind, number>>;
  const smoothedRatio = (kind: 'listening' | 'reading') => {
    const items = responses.filter((response) => response.kind === kind);
    return items.length ? (items.reduce((sum, item) => sum + responseScore(item), 0) + 1) / (items.length + 2) : 0;
  };
  const rawSectionRatios = {
    writing: levels.writing ?? 0,
    listening: smoothedRatio('listening'),
    reading: smoothedRatio('reading'),
    translation: levels.translation ?? 0,
  };
  const sectionScores: DiagnosticSectionScores = {
    writing: rounded(rawSectionRatios.writing * sectionWeights.writing),
    listening: rounded(rawSectionRatios.listening * sectionWeights.listening),
    reading: rounded(rawSectionRatios.reading * sectionWeights.reading),
    translation: rounded(rawSectionRatios.translation * sectionWeights.translation),
  };
  const estimatedScore = Math.round(Object.entries(rawSectionRatios).reduce(
    (sum, [kind, ratio]) => sum + ratio * sectionWeights[kind as keyof DiagnosticSectionScores], 0,
  ));
  return {
    version: 2,
    sessionId,
    completedAt,
    questionCount: responses.length,
    levels,
    sectionScores,
    estimatedScore,
    scoreRange: { low: bounded(estimatedScore - 55), high: bounded(estimatedScore + 55) },
    weakSkills: rankDiagnosticWeakSkills(levels),
    confidence: 'initial',
  };
}

export function selectDiagnosticWeakSkill(levels?: Partial<Record<CoreStudyKind, number>>): CoreStudyKind | null {
  if (!levels) return null;
  return legacyDiagnosticCategories
    .flatMap((kind) => typeof levels[kind] === 'number' && Number.isFinite(levels[kind]) ? [{ kind, level: levels[kind]! }] : [])
    .sort((left, right) => left.level - right.level)[0]?.kind ?? null;
}
