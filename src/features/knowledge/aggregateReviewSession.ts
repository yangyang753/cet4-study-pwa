export interface AggregateReviewSession {
  queue: string[];
  currentIndex: number;
  currentId: string | null;
  answeredCount: number;
  correctCount: number;
  missedCount: number;
  completed: boolean;
}

export function createAggregateReviewSession(ids: string[], random: () => number = Math.random): AggregateReviewSession {
  const queue = [...new Set(ids)];
  for (let index = queue.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [queue[index], queue[target]] = [queue[target], queue[index]];
  }
  return {
    queue,
    currentIndex: 0,
    currentId: queue[0] ?? null,
    answeredCount: 0,
    correctCount: 0,
    missedCount: 0,
    completed: queue.length === 0,
  };
}

export function recordAggregateReviewResult(session: AggregateReviewSession, correct: boolean): AggregateReviewSession {
  if (session.completed || !session.currentId) return session;
  const answeredCount = session.answeredCount + 1;
  const currentIndex = session.currentIndex + 1;
  const currentId = session.queue[currentIndex] ?? null;
  return {
    ...session,
    currentIndex,
    currentId,
    answeredCount,
    correctCount: session.correctCount + Number(correct),
    missedCount: session.missedCount + Number(!correct),
    completed: currentId === null,
  };
}
