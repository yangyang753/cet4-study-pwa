import { describe, expect, it } from 'vitest';
import { validateSubjectiveSubmission } from './validateSubjectiveSubmission';

describe('validateSubjectiveSubmission', () => {
  it('rejects empty and short writing without discarding the response', () => {
    expect(validateSubjectiveSubmission('writing', '')).toEqual({ valid: false, message: '请先完成写作，至少输入 120 个英文单词。' });
    expect(validateSubjectiveSubmission('writing', 'Practice is useful.')).toEqual({ valid: false, message: '当前 3 词，至少需要 120 个英文单词才能完成任务。' });
    expect(validateSubjectiveSubmission('writing', Array(119).fill('practice').join(' ')).valid).toBe(false);
    expect(validateSubjectiveSubmission('writing', Array(120).fill('practice').join(' ')).valid).toBe(true);
  });

  it('requires a translation of at least 15 words with ending punctuation', () => {
    expect(validateSubjectiveSubmission('translation', 'This translation has enough English words but it is deliberately missing the required final punctuation')).toEqual({ valid: false, message: '请在译文末尾补充句号、问号或感叹号。' });
    expect(validateSubjectiveSubmission('translation', 'This complete translation contains more than fifteen English words and ends with the punctuation that learners need.').valid).toBe(true);
  });
});
