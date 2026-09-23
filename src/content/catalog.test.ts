import { describe, expect, it } from 'vitest';
import { contentCatalog, getPracticeItems, getQuestion, validateCatalogReferences } from './catalog';

describe('v1 content catalog', () => {
  it('exposes the approved content inventory through one typed catalog', () => {
    expect(contentCatalog.listening).toHaveLength(24);
    expect(contentCatalog.reading).toHaveLength(30);
    expect(contentCatalog.translation).toHaveLength(12);
    expect(contentCatalog.writing).toHaveLength(12);
    expect(contentCatalog.mocks).toHaveLength(6);
  });

  it('normalizes answer indexes and stable question ids', () => {
    const question = getQuestion('listen-01:q1');
    expect(question && 'correctAnswer' in question ? question.correctAnswer : null).toBe('B');
    expect(getPracticeItems('translation')).toHaveLength(12);
  });

  it('contains no broken references in the shipped catalog', () => {
    expect(validateCatalogReferences()).toEqual([]);
  });
});
