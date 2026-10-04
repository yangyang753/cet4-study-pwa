export interface AggregateReviewSession {
  queue: string[];
  currentIndex: number;
  currentId: string | null;
  answeredCount: number;
  correctCount: number;
  missedCount: number;
  completed: boolean;
}

interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
  removeItem(key: string): unknown;
}

const aggregateReviewStorageKey = 'cet4:aggregate-review-session:v1';

interface LearnedState {
  itemId: string;
  status: string;
  updatedAt: string;
  nextReviewAt?: string;
  lapseCount?: number;
}

export function selectAggregateReviewIds(states: LearnedState[], now: string, limit = 20): string[] {
  const nowTime = Date.parse(now);
  return [...states]
    .filter((state) => ['learning', 'review', 'mastered'].includes(state.status))
    .sort((left, right) => {
      const leftDue = !left.nextReviewAt || Date.parse(left.nextReviewAt) <= nowTime;
      const rightDue = !right.nextReviewAt || Date.parse(right.nextReviewAt) <= nowTime;
      return Number(rightDue) - Number(leftDue)
        || (right.lapseCount ?? 0) - (left.lapseCount ?? 0)
        || Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
    })
    .map((state) => state.itemId)
    .filter((id, index, all) => all.indexOf(id) === index)
    .slice(0, limit);
}

function isAggregateReviewSession(value: unknown): value is AggregateReviewSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AggregateReviewSession>;
  return Array.isArray(candidate.queue)
    && candidate.queue.every((id) => typeof id === 'string')
    && typeof candidate.currentIndex === 'number'
    && (typeof candidate.currentId === 'string' || candidate.currentId === null)
    && typeof candidate.answeredCount === 'number'
    && typeof candidate.correctCount === 'number'
    && typeof candidate.missedCount === 'number'
    && typeof candidate.completed === 'boolean';
}

export function loadAggregateReviewSession(storage: StorageAdapter = localStorage): AggregateReviewSession | null {
  try {
    const raw = storage.getItem(aggregateReviewStorageKey);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isAggregateReviewSession(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveAggregateReviewSession(session: AggregateReviewSession, storage: StorageAdapter = localStorage): void {
  try {
    storage.setItem(aggregateReviewStorageKey, JSON.stringify(session));
  } catch {
    // The review still works in memory when private browsing blocks storage.
  }
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
