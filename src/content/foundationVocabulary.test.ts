import { describe, expect, it } from 'vitest';
import { learningVocabulary } from './vocabularyLearning';
import { auditFoundationVocabulary, foundationVocabulary } from './foundationVocabulary';

const required = [
  'see', 'think', 'go', 'use', 'work', 'support', 'achieve', 'time', 'way', 'year', 'world',
  'school', 'education', 'research', 'society', 'government', 'technology', 'economic',
  'development', 'responsibility', 'resource', 'result', 'solution',
];

describe('foundationVocabulary', () => {
  it('ships 180 separate foundation words without duplicating the 800-word core', () => {
    expect(foundationVocabulary).toHaveLength(180);
    expect(new Set(foundationVocabulary.map((entry) => entry.id)).size).toBe(180);
    expect(new Set(foundationVocabulary.map((entry) => entry.word.toLowerCase())).size).toBe(180);
    expect(foundationVocabulary.every((entry) => /^f\d{4}$/.test(entry.id) && entry.layer === 'foundation')).toBe(true);
    const core = new Set(learningVocabulary.map((entry) => entry.word.toLowerCase()));
    expect(foundationVocabulary.filter((entry) => core.has(entry.word.toLowerCase()))).toEqual([]);
  });

  it('covers the audited basic and CET-4 topic vocabulary', () => {
    const words = new Set(foundationVocabulary.map((entry) => entry.word.toLowerCase()));
    expect(required.filter((word) => !words.has(word))).toEqual([]);
  });

  it('keeps every entry complete, concise, and usable in a natural example', () => {
    for (const entry of foundationVocabulary) {
      expect(entry.phonetic.trim(), entry.word).not.toBe('');
      expect(entry.phonetic, entry.word).not.toBe(`/${entry.word}/`);
      expect(entry.partOfSpeech.trim(), entry.word).not.toBe('');
      expect(entry.meaningZh.trim(), entry.word).not.toBe('');
      expect(entry.meaningZh.split('；').length, entry.word).toBeLessThanOrEqual(4);
      expect(entry.example, entry.word).toMatch(/[.!?]$/);
      expect(entry.example.toLowerCase(), entry.word).toContain(entry.word.toLowerCase());
      expect(entry.exampleZh?.trim(), entry.word).not.toBe('');
    }
    expect(auditFoundationVocabulary(foundationVocabulary, learningVocabulary)).toEqual([]);
  });
});
