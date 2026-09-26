export type MockReadinessStatus = 'insufficient' | 'stable' | 'borderline' | 'risk';

export interface MockReadiness {
  status: MockReadinessStatus;
  sampleSize: number;
  minimum: number | null;
  average: number | null;
}

export function assessMockReadiness(scores: number[]): MockReadiness {
  const recent = scores.slice(0, 3);
  const minimum = recent.length ? Math.min(...recent) : null;
  const average = recent.length ? Math.round(recent.reduce((sum, score) => sum + score, 0) / recent.length) : null;
  if (recent.length < 3) return { status: 'insufficient', sampleSize: recent.length, minimum, average };
  if (minimum! >= 450) return { status: 'stable', sampleSize: 3, minimum, average };
  if (minimum! >= 425) return { status: 'borderline', sampleSize: 3, minimum, average };
  return { status: 'risk', sampleSize: 3, minimum, average };
}
