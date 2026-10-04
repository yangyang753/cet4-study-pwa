export interface AggregateReviewSession {
  queue: string[];
  currentIndex: number;
  currentId: string | null;
  answeredCount: number;
  correctCount: number;
  missedCount: number;
  completed: boolean;
}

interface LearnedState {
  itemId: string;
  status: string;
  updatedAt: string;
  nextReviewAt?: string;
  lapseCount?: number;
}

export function selectAggregateReviewIds(states: LearnedState[], now: string, limit = 20): string[] {
  const nowTime = Date.parse(now);
  const today = now.slice(0, 10);
  return [...states]
    .filter((state) => ['learning', 'review', 'mastered'].includes(state.status))
    .sort((left, right) => {
      const leftToday = left.updatedAt.slice(0, 10) === today;
      const rightToday = right.updatedAt.slice(0, 10) === today;
      const leftDue = !left.nextReviewAt || Date.parse(left.nextReviewAt) <= nowTime;
      const rightDue = !right.nextReviewAt || Date.parse(right.nextReviewAt) <= nowTime;
      return Number(rightToday) - Number(leftToday)
        || Number(rightDue) - Number(leftDue)
        || (right.lapseCount ?? 0) - (left.lapseCount ?? 0)
        || Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
    })
    .map((state) => state.itemId)
    .filter((id, index, all) => all.indexOf(id) === index)
    .slice(0, limit);
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
