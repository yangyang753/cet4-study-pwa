export interface ExamAttemptSummary { kind: string; correct: boolean; durationSeconds: number }

export function summarizeExam(attempts: ExamAttemptSummary[]) {
  const totalSeconds = attempts.reduce((sum, attempt) => sum + attempt.durationSeconds, 0);
  const accuracy = attempts.length ? attempts.filter((attempt) => attempt.correct).length / attempts.length : 0;
  const byKind: Record<string, { accuracy: number; totalSeconds: number; count: number }> = {};
  for (const attempt of attempts) {
    const item = byKind[attempt.kind] ?? { accuracy: 0, totalSeconds: 0, count: 0 };
    const correctCount = item.accuracy * item.count + Number(attempt.correct);
    item.count += 1;
    item.accuracy = correctCount / item.count;
    item.totalSeconds += attempt.durationSeconds;
    byKind[attempt.kind] = item;
  }
  return { accuracy, totalSeconds, byKind, recommendation: Object.entries(byKind).sort((a, b) => a[1].accuracy - b[1].accuracy)[0]?.[0] ?? null };
}
