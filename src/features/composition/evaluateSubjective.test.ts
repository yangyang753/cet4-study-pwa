import { describe, expect, it } from 'vitest';
import { evaluateSubjective } from './evaluateSubjective';

describe('evaluateSubjective', () => {
  it('turns writing checks into a bounded local score without claiming an official score', () => {
    const feedback = evaluateSubjective('writing', `Daily reading matters because it gives students a calm way to build knowledge beyond their classes. It also improves concentration and helps readers discover different views.\n\nFor example, our university could hold a weekly book circle in the library. Students would choose a short book, record one useful idea, and discuss it with classmates. This activity would make reading social without turning it into another examination. Moreover, teachers could recommend accessible books while allowing students to make the final choice. The circle could also display short student reviews for newcomers.\n\nIn conclusion, a simple reading routine can support both academic progress and personal growth. If the campus provides a welcoming activity and enough freedom, more students will continue reading every day and gradually become confident, independent learners.` , []);
    expect(feedback.checks.map((item) => item.label)).toEqual(expect.arrayContaining(['篇幅', '段落结构', '逻辑衔接', '句子完整性']));
    expect(feedback.checks.find((item) => item.label === '段落结构')?.passed).toBe(true);
    expect(feedback.disclaimer).toContain('不等同于官方阅卷或人工评分');
    expect(feedback.score).toBe(1);
    expect(feedback.passed).toBe(true);
    expect(feedback.stableEligible).toBe(false);
  });

  it('checks translation keyword coverage and handles empty text', () => {
    const empty = evaluateSubjective('translation', '', ['culture', 'development']);
    expect(empty.errorCodes).toEqual(expect.arrayContaining(['length', 'task-coverage', 'predicate']));
    expect(empty.passed).toBe(false);
    const feedback = evaluateSubjective('translation', 'Culture supports sustainable development.', ['culture', 'development']);
    expect(feedback.checks.find((item) => item.label === '关键词覆盖')?.passed).toBe(true);
    expect(feedback.checks.find((item) => item.label === '句子完整性')?.passed).toBe(false);
  });

  it('does not pass a writing response made from repeated filler words', () => {
    const filler = `First, ${Array(125).fill('practice').join(' ')}.`;
    const feedback = evaluateSubjective('writing', filler, []);
    expect(feedback.checks.find((item) => item.code === 'filler')?.passed).toBe(false);
    expect(feedback.passed).toBe(false);
  });

  it('requires a plausible predicate rather than punctuation alone', () => {
    const feedback = evaluateSubjective('translation', 'Culture development community responsibility.', ['culture', 'development']);
    expect(feedback.checks.find((item) => item.label === '基本句法')?.passed).toBe(false);
    expect(feedback.passed).toBe(false);
  });
});
