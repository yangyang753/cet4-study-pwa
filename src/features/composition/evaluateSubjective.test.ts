import { describe, expect, it } from 'vitest';
import { evaluateSubjective } from './evaluateSubjective';

describe('evaluateSubjective', () => {
  it('turns writing checks into a bounded local score without claiming an official score', () => {
    const feedback = evaluateSubjective('writing', `First, ${Array(60).fill('practice').join(' ')}.\n\nTherefore, ${Array(60).fill('learners').join(' ')}.` , []);
    expect(feedback.checks.map((item) => item.label)).toEqual(expect.arrayContaining(['篇幅', '段落结构', '连接表达', '句子完整性']));
    expect(feedback.checks.find((item) => item.label === '段落结构')?.passed).toBe(true);
    expect(feedback.disclaimer).toContain('不等同于官方阅卷或人工评分');
    expect(feedback.score).toBeGreaterThanOrEqual(0.6);
    expect(feedback.passed).toBe(true);
  });

  it('checks translation keyword coverage and handles empty text', () => {
    const empty = evaluateSubjective('translation', '', ['culture', 'development']);
    expect(empty.checks.every((item) => !item.passed)).toBe(true);
    expect(empty).toMatchObject({ score: 0, passed: false });
    const feedback = evaluateSubjective('translation', 'Culture supports sustainable development.', ['culture', 'development']);
    expect(feedback.checks.find((item) => item.label === '关键词覆盖')?.passed).toBe(true);
    expect(feedback.checks.find((item) => item.label === '句子完整性')?.passed).toBe(true);
  });
});
