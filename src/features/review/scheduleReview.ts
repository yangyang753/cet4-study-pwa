export interface ReviewHistory { correct: boolean }
export interface ReviewSchedule { intervalDays: number; nextReviewAt: string; priority: number }
export interface ReviewStageSchedule extends ReviewSchedule { stage: number }

export function scheduleReviewStage(stage: number, correct: boolean, now: string, examDate: string): ReviewStageSchedule {
  const intervals = [0, 1, 3, 7, 14];
  const nextStage = correct ? Math.min(stage + 1, intervals.length - 1) : 0;
  const rawInterval = intervals[nextStage];
  const daysRemaining = Math.max(0, Math.ceil((Date.parse(`${examDate}T00:00:00Z`) - Date.parse(`${now}T00:00:00Z`)) / 86_400_000));
  const intervalDays = daysRemaining === 0 ? 0 : Math.min(rawInterval, Math.max(1, Math.floor(daysRemaining / 2)));
  const next = new Date(`${now}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + intervalDays);
  return { stage: nextStage, intervalDays, nextReviewAt: next.toISOString(), priority: correct ? Math.max(1, 5 - nextStage) : 6 };
}

export function scheduleReview(history: ReviewHistory[], now: string, examDate: string): ReviewSchedule {
  let correctStreak = 0;
  for (let index = history.length - 1; index >= 0 && history[index].correct; index -= 1) correctStreak += 1;
  const intervals = [1, 3, 7, 14, 30];
  const baseInterval = intervals[Math.min(correctStreak, intervals.length - 1)];
  const daysRemaining = Math.max(1, Math.ceil((Date.parse(`${examDate}T00:00:00Z`) - Date.parse(`${now}T00:00:00Z`)) / 86_400_000));
  const intervalDays = Math.max(1, Math.min(baseInterval, Math.floor(daysRemaining / 2)));
  const next = new Date(`${now}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + intervalDays);
  const wrongCount = history.filter((item) => !item.correct).length;
  return { intervalDays, nextReviewAt: next.toISOString(), priority: Math.max(1, wrongCount * 2 - correctStreak) };
}
