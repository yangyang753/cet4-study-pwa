import type { VocabularyEntry } from '../../domain/content';
import type { KnowledgeState } from '../../domain/learning';

export function selectWarmupWords(entries: VocabularyEntry[], states: KnowledgeState[], limit = 10): VocabularyEntry[] {
  const stateById = new Map(states.map((state) => [state.itemId, state.status]));
  const rank = (entry: VocabularyEntry) => {
    const status = stateById.get(entry.id);
    if (status === 'review') return 0;
    if (!status) return 1;
    if (status === 'learning') return 2;
    return 3;
  };

  return [...entries]
    .sort((left, right) => rank(left) - rank(right))
    .slice(0, Math.max(0, limit));
}
