export interface AggregateReviewSession {
  schemaVersion: 2;
  contentVersion: 'v1';
  ownerId: string;
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
const aggregateReviewStoragePrefix = 'cet4:aggregate-review-session:v2';
const defaultContentVersion = 'v1' as const;

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

type StoredAggregateReviewSession = Partial<AggregateReviewSession> & Pick<AggregateReviewSession, 'queue' | 'currentIndex' | 'currentId' | 'answeredCount' | 'correctCount' | 'missedCount' | 'completed'>;

function isAggregateReviewSession(value: unknown): value is StoredAggregateReviewSession {
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

function storageKey(ownerId: string) {
  return `${aggregateReviewStoragePrefix}:${encodeURIComponent(ownerId || 'local')}`;
}

interface ReviewStorageOptions {
  storage?: StorageAdapter;
  ownerId?: string;
  contentVersion?: 'v1';
}

interface ReviewLoadOptions extends ReviewStorageOptions {
  validItemIds: Set<string>;
}

function repairSession(candidate: StoredAggregateReviewSession, validItemIds: Set<string>, ownerId: string, contentVersion: 'v1'): AggregateReviewSession | null {
  if (candidate.schemaVersion !== undefined && candidate.schemaVersion !== 2) return null;
  if (candidate.contentVersion !== undefined && candidate.contentVersion !== contentVersion) return null;
  if (candidate.ownerId !== undefined && candidate.ownerId !== ownerId) return null;
  const queue = candidate.queue.filter((id, index, all) => validItemIds.has(id) && all.indexOf(id) === index);
  if (!queue.length) return null;
  const answeredCount = Math.min(queue.length, Math.max(0, Math.floor(candidate.answeredCount)));
  const currentIndex = Math.min(queue.length, answeredCount);
  const completed = Boolean(candidate.completed) || currentIndex >= queue.length;
  const correctCount = Math.min(answeredCount, Math.max(0, Math.floor(candidate.correctCount)));
  const missedCount = Math.min(answeredCount - correctCount, Math.max(0, Math.floor(candidate.missedCount)));
  return {
    schemaVersion: 2,
    contentVersion,
    ownerId,
    queue,
    currentIndex,
    currentId: completed ? null : queue[currentIndex] ?? null,
    answeredCount,
    correctCount,
    missedCount,
    completed,
  };
}

export function loadAggregateReviewSession(options: ReviewLoadOptions): AggregateReviewSession | null {
  const storage = options.storage ?? localStorage;
  const ownerId = options.ownerId ?? 'local';
  const contentVersion = options.contentVersion ?? defaultContentVersion;
  const key = storageKey(ownerId);
  try {
    const raw = storage.getItem(key) ?? (ownerId === 'local' ? storage.getItem(aggregateReviewStorageKey) : null);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!isAggregateReviewSession(value)) { storage.removeItem(key); return null; }
    const repaired = repairSession(value, options.validItemIds, ownerId, contentVersion);
    if (!repaired) { storage.removeItem(key); return null; }
    storage.setItem(key, JSON.stringify(repaired));
    if (ownerId === 'local') storage.removeItem(aggregateReviewStorageKey);
    return repaired;
  } catch {
    return null;
  }
}

export function saveAggregateReviewSession(session: AggregateReviewSession, options: ReviewStorageOptions = {}): void {
  const storage = options.storage ?? localStorage;
  const ownerId = options.ownerId ?? session.ownerId ?? 'local';
  try {
    storage.setItem(storageKey(ownerId), JSON.stringify({ ...session, schemaVersion: 2, contentVersion: options.contentVersion ?? defaultContentVersion, ownerId }));
  } catch {
    // The review still works in memory when private browsing blocks storage.
  }
}

export function createAggregateReviewSession(ids: string[], random: () => number = Math.random, options: { ownerId?: string; contentVersion?: 'v1' } = {}): AggregateReviewSession {
  const queue = [...new Set(ids)];
  for (let index = queue.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [queue[index], queue[target]] = [queue[target], queue[index]];
  }
  return {
    schemaVersion: 2,
    contentVersion: options.contentVersion ?? defaultContentVersion,
    ownerId: options.ownerId ?? 'local',
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
