import type { SubjectiveQuestion } from '../../domain/content';

export type SubjectiveErrorCode = 'length' | 'structure' | 'task-coverage' | 'sentence-boundary' | 'predicate' | 'linking' | 'repetition' | 'filler' | 'target-word' | 'named-detail' | 'reference-copy';
export interface SubjectiveCheck { code: SubjectiveErrorCode; label: string; passed: boolean; suggestion: string }
export interface SubjectiveEvidence { checks: SubjectiveCheck[]; errorCodes: SubjectiveErrorCode[]; score: number; passed: boolean; stableEligible: boolean }

const stopWords = new Set('about after also and another are because been before being both can could does each from have into many more most must only other over should some such than that their them then there these they this those through very were what when where which while will with would write essay words'.split(' '));
const words = (body: string) => body.toLowerCase().match(/[a-z]+(?:'[a-z]+)?|\d+(?:[.,]\d+)?/g) ?? [];
const contentWords = (body: string) => [...new Set(words(body).filter((word) => word.length >= 4 && !stopWords.has(word)))];
const hasPredicate = (body: string) => /\b(?:am|is|are|was|were|be|been|being|do|does|did|have|has|had|can|could|may|might|must|shall|should|will|would|help|helps|helped|make|makes|made|take|takes|took|attract|attracts|attracted|improve|improves|improved|support|supports|supported|organize|organizes|organized|matter|matters|provide|provides|provided|give|gives|gave|build|builds|built|allow|allows|allowed|draw|draws|drew)\b/i.test(body)
  || words(body).some((word) => /(?:ed|ing)$/.test(word));
const sentenceCount = (body: string) => body.split(/[.!?。！？]+/).filter((sentence) => sentence.trim()).length;
const endsSentence = (body: string) => /[.!?。！？]\s*$/.test(body.trim());

function isReferenceCopy(body: string, reference: string) {
  const submitted = words(body);
  const expected = new Set(words(reference));
  if (!submitted.length || !expected.size) return false;
  const overlap = submitted.filter((word) => expected.has(word)).length / submitted.length;
  return submitted.length >= 8 && overlap >= 0.88;
}

function hasFiller(body: string) {
  const tokens = words(body).filter((word) => !/^\d/.test(word));
  if (!tokens.length) return true;
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  const highest = Math.max(...counts.values()) / tokens.length;
  return highest > 0.18 || new Set(tokens).size / tokens.length < 0.38 || /(\b[a-z]+\b)(?:\s+\1){2,}/i.test(body);
}

function namedDetails(question: SubjectiveQuestion) {
  const numbers = question.referenceAnswer.match(/\b\d+(?:[.,]\d+)?\b/g) ?? [];
  const capitals = question.referenceAnswer.match(/\b[A-Z][a-z]{2,}\b/g)?.filter((word) => !['The', 'This', 'That', 'Many', 'More', 'While', 'Today'].includes(word)) ?? [];
  return [...new Set([...numbers, ...capitals])];
}

const check = (code: SubjectiveErrorCode, label: string, passed: boolean, suggestion: string): SubjectiveCheck => ({ code, label, passed, suggestion });

export function analyzeSubjectiveEvidence(kind: 'writing' | 'translation', body: string, question: SubjectiveQuestion, options: { phase?: 'submission' | 'mastery' } = {}): SubjectiveEvidence {
  const text = body.trim();
  const tokenCount = words(text).filter((word) => !/^\d/.test(word)).length;
  const targets = contentWords(`${question.prompt} ${question.referenceAnswer}`).slice(0, kind === 'writing' ? 8 : 12);
  const coveredTargets = targets.filter((word) => text.toLowerCase().includes(word)).length;
  const coverageRequired = Math.min(kind === 'writing' ? 3 : 4, targets.length);
  const details = namedDetails(question);
  const paragraphCount = text.split(/\n\s*\n/).filter(Boolean).length;
  const filler = hasFiller(text);
  const copied = isReferenceCopy(text, question.referenceAnswer);
  const mastery = options.phase === 'mastery';
  const applicable: SubjectiveCheck[] = kind === 'writing' ? [
    check('length', '篇幅', mastery ? tokenCount >= 30 && tokenCount <= 60 : tokenCount >= 120 && tokenCount <= 180, mastery ? '用 30～60 词写一个完整微段落。' : tokenCount < 120 ? '补充具体理由或例子，达到 120～180 词。' : '删去重复内容，将篇幅控制在 120～180 词。'),
    check('structure', '段落结构', mastery ? sentenceCount(text) >= 2 : paragraphCount >= 2 && sentenceCount(text) >= 4, mastery ? '至少写两句：一句观点，一句理由或例子。' : '至少写两个段落和四个完整句子，形成观点、展开与结论。'),
    check('task-coverage', '回应题目', coveredTargets >= coverageRequired, '请直接回应题目主题和要求，不要只写通用句。'),
    check('linking', '逻辑衔接', /\b(?:first|second|however|therefore|moreover|finally|because|for example|in conclusion|as a result)\b/i.test(text), '使用 because、however、therefore 或例证表达明确句间关系。'),
    check('sentence-boundary', '句子边界', endsSentence(text) && sentenceCount(text) >= (mastery ? 2 : 4), '检查句号和句子边界，避免残句或一逗到底。'),
    check('predicate', '谓语结构', hasPredicate(text), '检查每个主要句子是否有明确谓语。'),
    check('filler', '有效内容', !filler, '删除重复填充词，补充具体、不同的信息。'),
    check('reference-copy', '独立表达', !copied, '不要照抄参考表达，请用自己的句子完成任务。'),
  ] : [
    check('length', '基本篇幅', tokenCount >= 15, '译文至少写 15 个英文单词。'),
    check('task-coverage', '核心信息', coveredTargets >= coverageRequired, '核对原文中的人物、动作、对象与结果是否完整。'),
    check('target-word', '目标表达', coveredTargets >= coverageRequired, `检查关键表达：${targets.slice(0, 6).join('、')}。`),
    check('named-detail', '时间与专名', details.every((detail) => text.toLowerCase().includes(detail.toLowerCase())), `保留题目中的数字或专名：${details.join('、') || '本题无额外专名'}。`),
    check('sentence-boundary', '句子边界', tokenCount >= 12 && endsSentence(text), '请写成完整英文句子并添加结尾标点。'),
    check('predicate', '谓语结构', hasPredicate(text), '当前表达像词语堆叠，请补充明确的主语和谓语。'),
    check('repetition', '连贯表达', !filler, '不要重复堆叠关键词，请完成连贯译文。'),
    check('reference-copy', '独立翻译', !copied, '请先独立翻译，不要照抄参考答案。'),
  ];
  const errorCodes = applicable.filter((item) => !item.passed).map((item) => item.code);
  const score = applicable.length ? applicable.filter((item) => item.passed).length / applicable.length : 0;
  const passed = errorCodes.length === 0;
  return { checks: applicable, errorCodes, score, passed, stableEligible: mastery && passed };
}
