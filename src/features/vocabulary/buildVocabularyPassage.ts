import type { VocabularyEntry } from '../../domain/content';

export interface VocabularyPassage {
  text: string;
  words: VocabularyEntry[];
}

function containsWord(sentence: string, word: string): boolean {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(sentence);
}

export function buildVocabularyPassage(entries: VocabularyEntry[]): VocabularyPassage {
  const words = entries;
  const sentences = words.map((entry) => {
    const example = entry.example.trim();
    if (example && containsWord(example, entry.word)) return /[.!?]$/.test(example) ? example : `${example}.`;
    return `The word "${entry.word}" connects an important idea in today's reading passage.`;
  });
  return { text: sentences.join(' '), words };
}
