import { describe, expect, it } from 'vitest';
import { foundationVocabulary } from './foundationVocabulary';
import { learningVocabulary } from './vocabularyLearning';
import { auditVocabularyEnrichment, enrichmentFor, vocabularyEnrichment } from './vocabularyEnrichment';

describe('vocabularyEnrichment', () => {
  it('covers at least 120 known source words with valid family or confusable practice', () => {
    expect(vocabularyEnrichment.length).toBeGreaterThanOrEqual(120);
    expect(auditVocabularyEnrichment(vocabularyEnrichment, [...foundationVocabulary, ...learningVocabulary])).toEqual([]);
  });

  it('contains the required high-value word families', () => {
    const byWord = new Map([...foundationVocabulary, ...learningVocabulary].map((entry) => [entry.word, entry.id]));
    expect(enrichmentFor(byWord.get('develop')!)?.family.map((item) => item.word)).toEqual(expect.arrayContaining(['development', 'developmental']));
    expect(enrichmentFor(byWord.get('economy')!)?.family.map((item) => item.word)).toEqual(expect.arrayContaining(['economic', 'economical']));
    expect(enrichmentFor(byWord.get('responsible')!)?.family.map((item) => item.word)).toContain('responsibility');
    expect(enrichmentFor(byWord.get('information')!)?.family.map((item) => item.word)).toEqual(expect.arrayContaining(['inform', 'informative']));
    expect(enrichmentFor(byWord.get('education')!)?.family.map((item) => item.word)).toEqual(expect.arrayContaining(['educate', 'educational']));
    expect(enrichmentFor(byWord.get('knowledge')!)?.family.map((item) => item.word)).toContain('knowledgeable');
  });

  it('does not ship mechanical non-words or low-value pseudo-derivatives', () => {
    const forbidden = new Set([
      'economicly', 'samely', 'anothers', 'arounds', 'agains', 'againsts', 'withouts',
      'unders', 'untils', 'knowledges', 'youngly', 'betterly', 'bestly', 'smallly',
      'likelyly', 'sometimeses', 'alwayses', 'alreadies', 'alsos', 'althoughs',
      'sinces', 'whethers', 'amongs', 'acrosses', 'aboves', 'eaches', 'everies',
      'severals', 'fews', 'manies', 'muches', 'mosts', 'lesses', 'leasts', 'someones',
      'educations', 'informations', 'researches',
    ]);
    const shipped = vocabularyEnrichment.flatMap((entry) => entry.family.map((item) => item.word));
    expect(shipped.filter((word) => forbidden.has(word))).toEqual([]);
  });

  it.each([
    ['affect', 'effect'], ['adapt', 'adopt'], ['access', 'assess'], ['rise', 'raise'], ['rise', 'arise'],
  ])('teaches the distinction between %s and %s without a self-reference', (source, target) => {
    const all = [...foundationVocabulary, ...learningVocabulary];
    const sourceId = all.find((entry) => entry.word === source)?.id;
    const item = sourceId ? enrichmentFor(sourceId) : null;
    expect(item?.confusables.some((candidate) => candidate.word === target && candidate.distinctionZh.trim() && candidate.example.includes(target))).toBe(true);
  });
});
