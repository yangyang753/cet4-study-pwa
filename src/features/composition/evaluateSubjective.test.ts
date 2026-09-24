import { describe, expect, it } from 'vitest';
import { evaluateSubjective } from './evaluateSubjective';

describe('evaluateSubjective', () => {
  it('returns actionable writing checks without an official score', () => {
    const feedback = evaluateSubjective('writing', 'First, daily practice helps.\n\nTherefore, learners improve steadily.', []);
    expect(feedback.checks.map((item) => item.label)).toEqual(expect.arrayContaining(['篇幅', '段落结构', '连接表达', '句子完整性']));
    expect(feedback.checks.find((item) => item.label === '段落结构')?.passed).toBe(true);
    expect(feedback.disclaimer).toContain('不等同于官方阅卷或人工评分');
    expect(feedback).not.toHaveProperty('score');
  });

  it('checks translation keyword coverage and handles empty text', () => {
    const empty = evaluateSubjective('translation', '', ['culture', 'development']);
    expect(empty.checks.every((item) => !item.passed)).toBe(true);
    const feedback = evaluateSubjective('translation', 'Culture supports sustainable development.', ['culture', 'development']);
    expect(feedback.checks.find((item) => item.label === '关键词覆盖')?.passed).toBe(true);
    expect(feedback.checks.find((item) => item.label === '句子完整性')?.passed).toBe(true);
  });
});
