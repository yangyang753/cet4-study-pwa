import { describe, expect, it } from 'vitest';
import culturePrompts from '../../../content/v1/cultureTranslations.json';
import vocabulary from '../../../content/v1/vocabulary.json';
import { auditCultureTranslations, evaluateCultureTranslation, selectDailyCultureTranslation } from './cultureTranslation';

describe('daily culture translation', () => {
  it('selects one prompt deterministically by study date', () => {
    const first = selectDailyCultureTranslation(culturePrompts, '2026-09-26');
    expect(selectDailyCultureTranslation(culturePrompts, '2026-09-26').id).toBe(first.id);
    expect(selectDailyCultureTranslation(culturePrompts, '2026-09-27').id).not.toBe(first.id);
  });

  it('accepts common inflections and reports each missing target word', () => {
    const prompt = {
      id: 'culture-test', theme: '文化传承', promptZh: '中国文化在不同世代之间传承。',
      referenceAnswer: 'Chinese culture has developed across generations.',
      targetWordIds: ['v0164', 'v0100', 'v0290'], keyPoints: ['文化', '发展', '世代'],
    };
    const result = evaluateCultureTranslation(prompt, 'Chinese culture develops through many generations.', vocabulary);
    expect(result.coveredWordIds).toEqual(['v0164', 'v0100', 'v0290']);
    expect(result.missedWordIds).toEqual([]);
    expect(result.passed).toBe(true);

    expect(evaluateCultureTranslation(prompt, 'Chinese culture is meaningful.', vocabulary).missedWordIds).toEqual(['v0100', 'v0290']);
  });

  it('contains a valid original culture bank with auditable target words', () => {
    expect(culturePrompts).toHaveLength(24);
    expect(auditCultureTranslations(culturePrompts, vocabulary)).toEqual([]);
    expect(new Set(culturePrompts.map((item) => item.theme)).size).toBe(24);
  });
});
