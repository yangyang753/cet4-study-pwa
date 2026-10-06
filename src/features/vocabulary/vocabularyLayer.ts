import { foundationVocabulary } from '../../content/foundationVocabulary';
import { learningVocabulary } from '../../content/vocabularyLearning';
import type { VocabularyEntry, VocabularyLayer } from '../../domain/content';

export type { VocabularyLayer } from '../../domain/content';

export function vocabularyLayerOf(wordId: string): VocabularyLayer {
  return /^f\d{4}$/i.test(wordId) ? 'foundation' : 'core';
}

export function catalogForLayer(layer: VocabularyLayer): VocabularyEntry[] {
  return layer === 'foundation' ? foundationVocabulary : learningVocabulary;
}

export function vocabularyById(wordId: string): VocabularyEntry | null {
  return catalogForLayer(vocabularyLayerOf(wordId)).find((entry) => entry.id === wordId) ?? null;
}
