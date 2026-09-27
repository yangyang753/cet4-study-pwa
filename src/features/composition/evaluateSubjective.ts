import type { SubjectiveQuestion } from '../../domain/content';
import { analyzeSubjectiveEvidence, type SubjectiveCheck, type SubjectiveErrorCode } from './subjectiveEvidence';

export type { SubjectiveCheck, SubjectiveErrorCode } from './subjectiveEvidence';
export interface SubjectiveFeedback { checks: SubjectiveCheck[]; errorCodes: SubjectiveErrorCode[]; score: number; passed: boolean; stableEligible: boolean; disclaimer: string }

export function evaluateSubjective(kind: 'writing' | 'translation', body: string, keywords: string[], question?: SubjectiveQuestion): SubjectiveFeedback {
  const syntheticQuestion: SubjectiveQuestion = question ?? {
    id: 'local-evaluation', version: 1, type: kind, difficulty: 'foundation', prompt: keywords.join(' '),
    knowledgePointIds: [], explanationZh: '', sourceNote: 'local', rubric: [], referenceAnswer: keywords.join(' '),
  };
  const evidence = analyzeSubjectiveEvidence(kind, body, syntheticQuestion);
  const checks = evidence.checks.map((item) => ({
    ...item,
    label: item.code === 'task-coverage' && kind === 'translation' ? '关键词覆盖'
      : item.code === 'predicate' ? '基本句法'
        : item.code === 'sentence-boundary' ? '句子完整性' : item.label,
  }));
  return { ...evidence, checks, disclaimer: '这是规则化自查建议，不等同于官方阅卷或人工评分；通过只表示已满足本地可解释规则。' };
}
