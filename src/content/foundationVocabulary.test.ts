import { describe, expect, it } from 'vitest';
import { learningVocabulary } from './vocabularyLearning';
import { auditFoundationVocabulary, foundationVocabulary } from './foundationVocabulary';

const required = [
  'a', 'i', 'may', 'might', 'must', 'should', 'where', 'why', 'though',
  'mine', 'yours', 'ours', 'theirs', 'myself', 'yourself', 'themselves',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'see', 'think', 'go', 'use', 'work', 'support', 'achieve', 'time', 'way', 'year', 'world',
  'school', 'education', 'research', 'society', 'government', 'technology', 'economic',
  'development', 'responsibility', 'resource', 'result', 'solution',
];

describe('foundationVocabulary', () => {
  it('ships 203 separate foundation words without duplicating the high-frequency core', () => {
    expect(foundationVocabulary).toHaveLength(203);
    expect(new Set(foundationVocabulary.map((entry) => entry.id)).size).toBe(203);
    expect(new Set(foundationVocabulary.map((entry) => entry.word.toLowerCase())).size).toBe(203);
    expect(foundationVocabulary.every((entry) => /^f\d{4}$/.test(entry.id) && entry.layer === 'foundation')).toBe(true);
    const core = new Set(learningVocabulary.map((entry) => entry.word.toLowerCase()));
    expect(foundationVocabulary.filter((entry) => core.has(entry.word.toLowerCase()))).toEqual([]);
  });

  it('covers the audited basic and CET-4 topic vocabulary', () => {
    const words = new Set(foundationVocabulary.map((entry) => entry.word.toLowerCase()));
    expect(required.filter((word) => !words.has(word))).toEqual([]);
  });

  it('teaches the irregular forms a foundation learner must recognize', () => {
    const expected: Record<string, string[]> = {
      be: ['am', 'is', 'are', 'was', 'were', 'been', 'being'],
      have: ['has', 'had', 'having'],
      do: ['does', 'did', 'done', 'doing'],
      go: ['goes', 'went', 'gone', 'going'],
      see: ['saw', 'seen'],
      think: ['thought'],
      write: ['wrote', 'written'],
      speak: ['spoke', 'spoken'],
      teach: ['taught'],
      understand: ['understood'],
      forget: ['forgot', 'forgotten'],
      rise: ['rose', 'risen'],
      spend: ['spent'],
    };
    for (const [word, forms] of Object.entries(expected)) {
      expect(foundationVocabulary.find((entry) => entry.word === word)?.derivatives, word).toEqual(forms);
    }
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

  it('does not teach foundation verbs through mechanical or misleading examples', () => {
    expect(foundationVocabulary.filter((entry) => /can \w+ more effectively through regular practice/i.test(entry.example))).toEqual([]);
  });
});
