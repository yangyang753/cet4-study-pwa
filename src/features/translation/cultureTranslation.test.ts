import { describe, expect, it } from 'vitest';
import { cultureTranslationBank as culturePrompts } from '../../content/cultureTranslations';
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

  it('does not pass a target-word list that omits the subject meaning', () => {
    const prompt = {
      id: 'culture-test', theme: '文化传承', promptZh: '中国文化在不同世代之间传承。',
      referenceAnswer: 'Chinese culture has developed across generations.',
      targetWordIds: ['v0164', 'v0100', 'v0290'], keyPoints: ['中国文化', '发展', '世代'],
    };
    const result = evaluateCultureTranslation(prompt, 'Culture develops through generations today.', vocabulary);
    expect(result.missedWordIds).toEqual([]);
    expect(result.meaningComplete).toBe(false);
    expect(result.reviewWordIds).toEqual(['v0164', 'v0100', 'v0290']);
    expect(result.passed).toBe(false);
  });

  it('does not accept a long keyword pile that covers only a minority of the reference meaning', () => {
    const prompt = {
      id: 'culture-strict', theme: '文化交流', promptZh: '中国文化促进不同社会之间的理解与交流。',
      referenceAnswer: 'Chinese culture promotes understanding and communication between different societies.',
      targetWordIds: ['v0164'], keyPoints: ['中国文化', '促进理解', '社会交流'],
    };
    const result = evaluateCultureTranslation(prompt, 'Chinese culture promotes understanding in modern life today.', vocabulary);
    expect(result.meaningComplete).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('contains a valid original culture bank with auditable target words', () => {
    expect(culturePrompts.length).toBeGreaterThanOrEqual(60);
    expect(auditCultureTranslations(culturePrompts, vocabulary)).toEqual([]);
    expect(new Set(culturePrompts.map((item) => item.theme)).size).toBe(culturePrompts.length);
  });
});
