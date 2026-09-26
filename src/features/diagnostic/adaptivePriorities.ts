import type { Attempt } from '../../domain/attempt';
import type { DiagnosticProfileV2 } from '../../domain/learning';
import { selectRecentEvidence, type CoreStudyKind } from '../dashboard/learningEvidence';

export interface LearningPriority {
  kind: CoreStudyKind;
  level: number;
  source: 'diagnostic' | 'recent';
  attempts: number;
}

const kindOrder: CoreStudyKind[] = ['vocabulary', 'grammar', 'listening', 'reading', 'writing', 'translation'];

export function deriveAdaptivePriorities(
  profile: DiagnosticProfileV2 | undefined,
  attempts: Attempt[],
  now: string,
): LearningPriority[] {
  const evidence = selectRecentEvidence(attempts, now);
  const byKind = new Map<CoreStudyKind, typeof evidence>();
  for (const item of evidence) byKind.set(item.kind, [...(byKind.get(item.kind) ?? []), item]);
  const kinds = new Set<CoreStudyKind>([
    ...Object.keys(profile?.levels ?? {}) as CoreStudyKind[],
    ...byKind.keys(),
  ]);
  return [...kinds].flatMap((kind): LearningPriority[] => {
    const recent = byKind.get(kind) ?? [];
    const diagnosticLevel = profile?.levels[kind];
    if (recent.length >= 3) {
      const totalWeight = recent.reduce((sum, item) => sum + item.weight, 0);
      const level = recent.reduce((sum, item) => sum + Math.max(0, Math.min(1, item.attempt.score ?? Number(item.correct))) * item.weight, 0) / totalWeight;
      return [{ kind, level, source: 'recent', attempts: recent.length }];
    }
    return typeof diagnosticLevel === 'number' ? [{ kind, level: diagnosticLevel, source: 'diagnostic', attempts: recent.length }] : [];
  }).sort((left, right) => left.level - right.level || kindOrder.indexOf(left.kind) - kindOrder.indexOf(right.kind)).slice(0, 2);
}
