export interface SubjectiveCheck { label: string; passed: boolean; suggestion: string }
export interface SubjectiveFeedback { checks: SubjectiveCheck[]; disclaimer: string }

const sentenceComplete = (body: string) => /[.!?。！？]\s*$/.test(body.trim());

export function evaluateSubjective(kind: 'writing' | 'translation', body: string, keywords: string[]): SubjectiveFeedback {
  const text = body.trim();
  const words = text ? text.split(/\s+/) : [];
  const normalized = text.toLowerCase();
  const checks: SubjectiveCheck[] = kind === 'writing' ? [
    { label: '篇幅', passed: words.length >= 80, suggestion: '目标写到 120～180 词；先补充一个具体理由或例子。' },
    { label: '段落结构', passed: text.split(/\n\s*\n/).filter(Boolean).length >= 2, suggestion: '至少分为开头和主体两段，建议再增加总结段。' },
    { label: '连接表达', passed: /\b(first|second|however|therefore|moreover|finally|because)\b/i.test(text), suggestion: '加入 First、However、Therefore 等连接词说明逻辑。' },
    { label: '句子完整性', passed: sentenceComplete(text), suggestion: '检查最后一句和每个句子的主语、谓语及结尾标点。' },
  ] : [
    { label: '关键词覆盖', passed: keywords.length > 0 && keywords.every((keyword) => normalized.includes(keyword.toLowerCase())), suggestion: `检查是否表达这些关键词：${keywords.join('、') || '题目核心信息'}。` },
    { label: '句子完整性', passed: sentenceComplete(text), suggestion: '检查英文句子是否包含主语和谓语，并补全结尾标点。' },
    { label: '时态语态', passed: /\b(is|are|was|were|has|have|had|will|can|be|been)\b/i.test(text), suggestion: '根据原文时间检查时态，必要时使用被动语态。' },
    { label: '固定搭配', passed: words.length >= 5, suggestion: '核对动词与介词、名词与动词的常用搭配。' },
  ];
  return { checks, disclaimer: '这是规则化自查建议，不等同于官方阅卷或人工评分。' };
}
