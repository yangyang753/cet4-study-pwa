import { describe, expect, it } from 'vitest';
import type { SubjectiveQuestion } from '../../domain/content';
import { analyzeSubjectiveEvidence } from './subjectiveEvidence';

const translationQuestion: SubjectiveQuestion = {
  id: 'trans-evidence', version: 1, type: 'translation', difficulty: 'standard',
  prompt: '2025年，大运河文化展吸引了许多年轻游客。', knowledgePointIds: ['translation:culture'],
  explanationZh: '保留时间、专名和主要动作。', sourceNote: '原创仿真练习', rubric: ['信息完整'],
  referenceAnswer: 'In 2025, the Grand Canal cultural exhibition attracted many young visitors and helped them understand Chinese history.',
};

const writingQuestion: SubjectiveQuestion = {
  ...translationQuestion, id: 'write-evidence', type: 'writing',
  prompt: 'Write an essay about why daily reading matters and propose a campus reading activity.',
  referenceAnswer: 'Daily reading broadens knowledge and the university could organize a weekly book circle.',
};

describe('analyzeSubjectiveEvidence', () => {
  it('rejects repeated filler and keyword-only translation', () => {
    const filler = `First, ${Array(130).fill('practice').join(' ')}.`;
    expect(analyzeSubjectiveEvidence('writing', filler, writingQuestion).errorCodes).toContain('filler');
    expect(analyzeSubjectiveEvidence('translation', 'Grand Canal 2025 culture exhibition young visitors.', translationQuestion).errorCodes).toEqual(expect.arrayContaining(['predicate', 'sentence-boundary']));
  });

  it('rejects copied reference text and missing named details', () => {
    expect(analyzeSubjectiveEvidence('translation', translationQuestion.referenceAnswer, translationQuestion).errorCodes).toContain('reference-copy');
    const missing = analyzeSubjectiveEvidence('translation', 'A cultural exhibition attracted many visitors and helped them understand the long history of China.', translationQuestion);
    expect(missing.errorCodes).toContain('named-detail');
  });

  it('accepts a real paraphrase but never treats one rule-only submission as stable mastery', () => {
    const result = analyzeSubjectiveEvidence('translation', 'The Grand Canal culture show drew a large number of young visitors in 2025, helping them learn more about Chinese history.', translationQuestion);
    expect(result.passed).toBe(true);
    expect(result.stableEligible).toBe(false);
  });

  it('accepts a structured 120–180 word essay with task coverage', () => {
    const essay = `Daily reading matters because it gives students a calm way to build knowledge beyond their classes. It also improves concentration and helps readers discover different views.\n\nFor example, our university could hold a weekly book circle in the library. Students would choose a short book, record one useful idea, and discuss it with classmates. This activity would make reading social without turning it into another examination. Moreover, teachers could recommend accessible books while allowing students to make the final choice. The circle could also display short student reviews for newcomers.\n\nIn conclusion, a simple reading routine can support both academic progress and personal growth. If the campus provides a welcoming activity and enough freedom, more students will continue reading every day and gradually become confident, independent learners.`;
    const result = analyzeSubjectiveEvidence('writing', essay, writingQuestion);
    expect(result.errorCodes).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.stableEligible).toBe(false);
  });
});
