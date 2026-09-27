import type { VocabularyEntry } from '../../domain/content';

export interface CultureTranslationPrompt {
  id: string;
  theme: string;
  promptZh: string;
  referenceAnswer: string;
  targetWordIds: string[];
  keyPoints: string[];
}

export interface CultureTranslationEvaluation {
  coveredWordIds: string[];
  missedWordIds: string[];
  reviewWordIds: string[];
  wordCount: number;
  complete: boolean;
  meaningComplete: boolean;
  passed: boolean;
}

const dateOrdinal = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
export function selectDailyCultureTranslation<T extends CultureTranslationPrompt>(prompts: T[], date: string): T {
  if (!prompts.length) throw new Error('中国文化翻译题库为空');
  const index = ((dateOrdinal(date) % prompts.length) + prompts.length) % prompts.length;
  return prompts[index];
}

const tokens = (text: string) => text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
const referenceStopWords = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'for', 'from', 'has', 'have', 'in', 'into', 'is', 'it', 'many', 'of', 'on', 'or', 'that', 'the', 'their', 'them', 'they', 'this', 'through', 'to', 'was', 'were', 'while', 'with']);
function forms(word: string) {
  const lower = word.toLowerCase();
  const result = new Set([lower, `${lower}s`, `${lower}ed`, `${lower}ing`]);
  if (lower.endsWith('y')) { result.add(`${lower.slice(0, -1)}ies`); result.add(`${lower.slice(0, -1)}ied`); }
  if (lower.endsWith('e')) { result.add(`${lower.slice(0, -1)}ing`); result.add(`${lower}d`); }
  return result;
}

export function evaluateCultureTranslation(prompt: CultureTranslationPrompt, answer: string, vocabulary: VocabularyEntry[]): CultureTranslationEvaluation {
  const answerTokens = new Set(tokens(answer));
  const byId = new Map(vocabulary.map((word) => [word.id, word]));
  const coveredWordIds = prompt.targetWordIds.filter((id) => {
    const word = byId.get(id);
    return word ? [...forms(word.word)].some((form) => answerTokens.has(form)) : false;
  });
  const missedWordIds = prompt.targetWordIds.filter((id) => !coveredWordIds.includes(id));
  const wordCount = tokens(answer).length;
  const targetForms = new Set(prompt.targetWordIds.flatMap((id) => {
    const word = byId.get(id);
    return word ? [...forms(word.word)] : [];
  }));
  const referenceAnchors = [...new Set(tokens(prompt.referenceAnswer).filter((token) => !referenceStopWords.has(token) && !targetForms.has(token)))];
  const requiredAnchors = referenceAnchors.length ? Math.max(1, Math.ceil(referenceAnchors.length * 0.2)) : 0;
  const matchedAnchors = referenceAnchors.filter((anchor) => answerTokens.has(anchor)).length;
  const meaningComplete = matchedAnchors >= requiredAnchors;
  const referenceWordCount = tokens(prompt.referenceAnswer).length;
  const minimumWordCount = Math.max(5, Math.floor(referenceWordCount * 0.55));
  const complete = wordCount >= minimumWordCount && /[.!?]\s*$/.test(answer.trim());
  const reviewWordIds = meaningComplete ? missedWordIds : [...prompt.targetWordIds];
  return { coveredWordIds, missedWordIds, reviewWordIds, wordCount, complete, meaningComplete, passed: complete && meaningComplete && missedWordIds.length === 0 };
}

export function auditCultureTranslations(prompts: CultureTranslationPrompt[], vocabulary: VocabularyEntry[]): string[] {
  const errors: string[] = [];
  const vocabularyIds = new Set(vocabulary.map((word) => word.id));
  const ids = new Set<string>();
  for (const prompt of prompts) {
    if (ids.has(prompt.id)) errors.push(`${prompt.id}: duplicate id`);
    ids.add(prompt.id);
    if (!prompt.theme.trim() || !prompt.promptZh.trim() || !prompt.referenceAnswer.trim()) errors.push(`${prompt.id}: missing content`);
    if (prompt.targetWordIds.length < 3 || prompt.targetWordIds.length > 5) errors.push(`${prompt.id}: expected 3-5 target words`);
    for (const id of prompt.targetWordIds) if (!vocabularyIds.has(id)) errors.push(`${prompt.id}: unknown vocabulary ${id}`);
    if (prompt.keyPoints.length < 3) errors.push(`${prompt.id}: insufficient key points`);
    const referenceEvaluation = evaluateCultureTranslation(prompt, prompt.referenceAnswer, vocabulary);
    if (referenceEvaluation.missedWordIds.length) errors.push(`${prompt.id}: reference answer misses ${referenceEvaluation.missedWordIds.join(', ')}`);
    if (!referenceEvaluation.complete) errors.push(`${prompt.id}: reference answer is incomplete`);
  }
  return errors;
}
