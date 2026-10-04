import type { Attempt } from '../../domain/attempt';

interface ListeningSetLike {
  id: string;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function selectListeningSetIndex(sets: ListeningSetLike[], attempts: Attempt[], date: string): number {
  if (!sets.length) return 0;
  const latestBySet = new Map<string, number>();
  for (const attempt of attempts) {
    if (attempt.kind !== 'listening') continue;
    const set = sets.find((candidate) => attempt.questionId.startsWith(`${candidate.id}:`));
    if (!set) continue;
    const timestamp = Date.parse(attempt.createdAt);
    if (!Number.isFinite(timestamp)) continue;
    latestBySet.set(set.id, Math.max(latestBySet.get(set.id) ?? Number.NEGATIVE_INFINITY, timestamp));
  }
  if (!latestBySet.size) return 0;
  const ranked = sets.map((set, index) => ({ set, index }))
    .sort((left, right) => {
      const leftSeen = latestBySet.has(left.set.id);
      const rightSeen = latestBySet.has(right.set.id);
      if (leftSeen !== rightSeen) return Number(leftSeen) - Number(rightSeen);
      if (!leftSeen && !rightSeen) return left.index - right.index;
      if (leftSeen && rightSeen) {
        const recency = latestBySet.get(left.set.id)! - latestBySet.get(right.set.id)!;
        if (recency) return recency;
      }
      return stableHash(`${date}:${left.set.id}`) - stableHash(`${date}:${right.set.id}`) || left.index - right.index;
    });
  return ranked[0]?.index ?? 0;
}
