export interface SubjectiveSubmissionValidation { valid: boolean; message: string }

export function countEnglishWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).filter((word) => /[a-z]/i.test(word)).length : 0;
}

export function validateSubjectiveSubmission(kind: 'writing' | 'translation', body: string): SubjectiveSubmissionValidation {
  const words = countEnglishWords(body);
  const minimum = kind === 'writing' ? 80 : 15;
  if (words === 0) return { valid: false, message: kind === 'writing' ? '请先完成写作，至少输入 80 个英文单词。' : '请先完成翻译，至少输入 15 个英文单词。' };
  if (words < minimum) return { valid: false, message: `当前 ${words} 词，至少需要 ${minimum} 个英文单词才能完成任务。` };
  if (kind === 'translation' && !/[.!?。！？]\s*$/.test(body.trim())) return { valid: false, message: '请在译文末尾补充句号、问号或感叹号。' };
  return { valid: true, message: '' };
}
