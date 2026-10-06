import source from '../../content/v1/vocabularyEnrichment.json';
import type { VocabularyEnrichment, VocabularyEntry } from '../domain/content';

export const vocabularyEnrichment = source as VocabularyEnrichment[];
const byId = new Map(vocabularyEnrichment.map((item) => [item.vocabularyId, item]));

export function enrichmentFor(vocabularyId: string): VocabularyEnrichment | null {
  return byId.get(vocabularyId) ?? null;
}

export function auditVocabularyEnrichment(entries: VocabularyEnrichment[], vocabulary: VocabularyEntry[]): string[] {
  const errors: string[] = [];
  const known = new Set(vocabulary.map((entry) => entry.id));
  const sourceIds = new Set<string>();
  for (const entry of entries) {
    if (!known.has(entry.vocabularyId)) errors.push(`${entry.vocabularyId}: unknown vocabulary source`);
    if (sourceIds.has(entry.vocabularyId)) errors.push(`${entry.vocabularyId}: duplicate enrichment source`);
    sourceIds.add(entry.vocabularyId);
    if (!entry.family.length && !entry.confusables.length) errors.push(`${entry.vocabularyId}: enrichment is empty`);
    const family = new Set<string>();
    for (const member of entry.family) {
      const word = member.word.toLowerCase().trim();
      if (!word || !member.partOfSpeech.trim() || !member.meaningZh.trim()) errors.push(`${entry.vocabularyId}: incomplete family member`);
      if (family.has(word)) errors.push(`${entry.vocabularyId}: duplicate family member ${word}`);
      family.add(word);
    }
    const confusables = new Set<string>();
    for (const item of entry.confusables) {
      const word = item.word.toLowerCase().trim();
      if (!word || !item.distinctionZh.trim() || !item.example.trim()) errors.push(`${entry.vocabularyId}: incomplete confusable`);
      if (confusables.has(word)) errors.push(`${entry.vocabularyId}: duplicate confusable ${word}`);
      if (!item.example.toLowerCase().includes(word)) errors.push(`${entry.vocabularyId}: confusable example misses ${word}`);
      confusables.add(word);
    }
    const sourceWord = vocabulary.find((word) => word.id === entry.vocabularyId)?.word.toLowerCase();
    if (sourceWord && (family.has(sourceWord) || confusables.has(sourceWord))) errors.push(`${entry.vocabularyId}: self-reference`);
  }
  if (entries.length < 120) errors.push(`vocabulary enrichment: expected at least 120, received ${entries.length}`);
  return errors;
}
