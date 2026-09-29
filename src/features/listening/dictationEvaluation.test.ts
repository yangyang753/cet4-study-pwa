import { describe, expect, it } from 'vitest';
import { evaluateDictation } from './dictationEvaluation';

describe('evaluateDictation', () => {
  it('keeps matching later words after one word is omitted', () => {
    const result = evaluateDictation('the new group meets on Sunday afternoon', 'the group meets on Sunday afternoon');
    expect(result.matched).toBe(6);
    expect(result.missing).toEqual(['new']);
    expect(result.extra).toEqual([]);
    expect(result.accuracy).toBe(86);
  });

  it('reports inserted words without marking the remaining sentence wrong', () => {
    const result = evaluateDictation('students should register early', 'students really should register early');
    expect(result.matched).toBe(4);
    expect(result.extra).toEqual(['really']);
    expect(result.missing).toEqual([]);
  });
});

