export interface SubjectiveCheck { label: string; passed: boolean; suggestion: string }
export interface SubjectiveFeedback { checks: SubjectiveCheck[]; score: number; passed: boolean; disclaimer: string }

const sentenceComplete = (body: string) => /[.!?。！？]\s*$/.test(body.trim());
const englishWords = (body: string) => body.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
const hasPredicate = (body: string) => {
  const words = englishWords(body);
  return /\b(?:am|is|are|was|were|be|been|being|do|does|did|have|has|had|can|could|may|might|must|shall|should|will|would)\b/i.test(body)
    || words.some((word) => /(?:ed|ing)$/.test(word) || (word.endsWith('s') && word.length > 3));
};
const hasLexicalVariety = (body: string) => {
  const words = englishWords(body);
  if (words.length === 0) return false;
  return new Set(words).size / words.length >= 0.25;
};

export function evaluateSubjective(kind: 'writing' | 'translation', body: string, keywords: string[]): SubjectiveFeedback {
  const text = body.trim();
  const words = text ? text.split(/\s+/) : [];
  const normalized = text.toLowerCase();
  const checks: SubjectiveCheck[] = kind === 'writing' ? [
    { label: '篇幅', passed: words.length >= 120 && words.length <= 180, suggestion: words.length < 120 ? '四级写作至少 120 词；请补充一个具体理由或例子。' : '建议控制在 120～180 词，删去重复表达。' },
    { label: '段落结构', passed: text.split(/\n\s*\n/).filter(Boolean).length >= 2, suggestion: '至少分为开头和主体两段，建议再增加总结段。' },
    { label: '连接表达', passed: /\b(first|second|however|therefore|moreover|finally|because)\b/i.test(text), suggestion: '加入 First、However、Therefore 等连接词说明逻辑。' },
    { label: '句子完整性', passed: sentenceComplete(text), suggestion: '检查最后一句和每个句子的主语、谓语及结尾标点。' },
    { label: '词汇多样性', passed: hasLexicalVariety(text), suggestion: '避免重复堆叠同一批词，尝试替换同义表达并补充具体内容。' },
  ] : [
    { label: '关键词覆盖', passed: keywords.length > 0 && keywords.every((keyword) => normalized.includes(keyword.toLowerCase())), suggestion: `检查是否表达这些关键词：${keywords.join('、') || '题目核心信息'}。` },
    { label: '句子完整性', passed: sentenceComplete(text), suggestion: '检查英文句子是否包含主语和谓语，并补全结尾标点。' },
    { label: '基本句法', passed: hasPredicate(text), suggestion: '当前表达像词语堆叠；请为句子补充明确的主语和谓语。' },
    { label: '固定搭配', passed: words.length >= 5, suggestion: '核对动词与介词、名词与动词的常用搭配。' },
  ];
  const score = checks.length ? checks.filter((check) => check.passed).length / checks.length : 0;
  return { checks, score, passed: score >= 0.75, disclaimer: '这是规则化自查建议，不等同于官方阅卷或人工评分。' };
}
