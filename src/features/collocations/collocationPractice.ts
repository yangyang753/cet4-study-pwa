import type { ObjectiveQuestion } from '../../domain/content';
import type { KnowledgeState, ReviewCard } from '../../domain/learning';

export interface CollocationEntry {
  id: string;
  phrase: string;
  meaningZh: string;
  example: string;
  exampleZh: string;
}

export interface CollocationRecallExercise {
  itemId: string;
  mode: 'zh-to-en' | 'en-to-zh' | 'cloze';
  prompt: string;
  answer: string;
  instruction: string;
  hint?: string;
}

function normalizeRecall(value: string) {
  return value.toLowerCase().replace(/[，。；、,.!?！？…\s]/g, '').trim();
}

const chineseEquivalents = [
  ['参加', '参与'], ['专注', '集中'], ['导致', '造成', '引起'], ['帮助', '有助于', '促进'],
  ['负责', '承担责任'], ['受益', '得到好处'], ['处理', '应对'], ['依靠', '依赖'],
] as const;

function equivalentChinese(left: string, right: string) {
  if (left === right || left.includes(right) || right.includes(left)) return true;
  return chineseEquivalents.some((group) => group.some((item) => left.includes(item)) && group.some((item) => right.includes(item)));
}

export function buildCollocationRecallExercise(item: CollocationEntry, random: () => number = Math.random): CollocationRecallExercise {
  const value = random();
  if (value < 1 / 3) return { itemId: item.id, mode: 'zh-to-en', prompt: item.meaningZh, answer: item.phrase, instruction: '根据中文写出完整重点搭配' };
  if (value < 2 / 3) return { itemId: item.id, mode: 'en-to-zh', prompt: item.phrase, answer: item.meaningZh, instruction: '写出重点搭配的完整中文含义' };
  const words = item.phrase.split(/\s+/);
  const hiddenIndex = Math.min(words.length - 1, Math.floor(((value - 2 / 3) * 3) * words.length));
  const hiddenWord = words[hiddenIndex];
  const prompt = words.map((word, index) => index === hiddenIndex ? '_'.repeat(Math.max(4, word.length)) : word).join(' ');
  return { itemId: item.id, mode: 'cloze', prompt, answer: hiddenWord, instruction: '根据中文提示，补全重点搭配中唯一的空白', hint: item.meaningZh };
}

export function gradeCollocationRecall(exercise: CollocationRecallExercise, response: string) {
  const submitted = normalizeRecall(response);
  const expected = normalizeRecall(exercise.answer);
  return exercise.mode === 'en-to-zh' ? equivalentChinese(submitted, expected) : submitted === expected;
}

export interface CollocationWorkload {
  entries: CollocationEntry[];
  newEntries: CollocationEntry[];
  reviewEntries: CollocationEntry[];
  newQuota: number;
  remaining: number;
}

export function buildCollocationWorkload(
  entries: CollocationEntry[], states: KnowledgeState[], today: string, examDate: string, reviewOnlyDay: boolean,
): CollocationWorkload {
  const stateById = new Map(states.map((state) => [state.itemId, state]));
  const dueAt = Date.parse(`${today}T23:59:59.999Z`);
  const daysRemaining = Math.max(1, Math.ceil((Date.parse(`${examDate}T00:00:00.000Z`) - Date.parse(`${today}T00:00:00.000Z`)) / 86_400_000));
  const acquisitionDays = Math.max(1, Math.ceil(Math.max(1, daysRemaining - 35) / 2));
  const unseen = entries.filter((entry) => !stateById.has(entry.id));
  const learned = entries.filter((entry) => stateById.has(entry.id)).sort((left, right) => {
    const leftState = stateById.get(left.id)!;
    const rightState = stateById.get(right.id)!;
    const leftDue = !leftState.nextReviewAt || Date.parse(leftState.nextReviewAt) <= dueAt;
    const rightDue = !rightState.nextReviewAt || Date.parse(rightState.nextReviewAt) <= dueAt;
    const precedingDate = new Date(Date.parse(`${today}T00:00:00.000Z`) - 86_400_000).toISOString().slice(0, 10);
    const leftFromPrecedingDay = leftState.updatedAt.slice(0, 10) === precedingDate;
    const rightFromPrecedingDay = rightState.updatedAt.slice(0, 10) === precedingDate;
    return Number(rightFromPrecedingDay) - Number(leftFromPrecedingDay) || Number(rightDue) - Number(leftDue) || (rightState.lapseCount ?? 0) - (leftState.lapseCount ?? 0) || Date.parse(leftState.updatedAt) - Date.parse(rightState.updatedAt);
  });
  const newQuota = reviewOnlyDay || unseen.length === 0 ? 0 : Math.min(6, Math.max(2, Math.ceil(unseen.length / acquisitionDays)));
  const reviewEntries = learned.slice(0, reviewOnlyDay ? 12 : 3);
  const newEntries = unseen.slice(0, newQuota);
  return { entries: [...reviewEntries, ...newEntries], newEntries, reviewEntries, newQuota, remaining: unseen.length };
}

const optionId = (index: number) => String.fromCharCode(65 + index);

export function buildCollocationQuestion(item: CollocationEntry, entries: CollocationEntry[]): ObjectiveQuestion {
  const index = Math.max(0, entries.findIndex((entry) => entry.id === item.id));
  const distractors: string[] = [];
  for (let offset = 1; distractors.length < 3 && offset < entries.length; offset += 1) {
    const meaning = entries[(index + offset) % entries.length].meaningZh;
    if (meaning !== item.meaningZh && !distractors.includes(meaning)) distractors.push(meaning);
  }
  const rawOptions = [item.meaningZh, ...distractors];
  const shift = index % rawOptions.length;
  const options = [...rawOptions.slice(shift), ...rawOptions.slice(0, shift)];
  const correctIndex = options.indexOf(item.meaningZh);
  return {
    id: `${item.id}:collocation`, version: 1, type: 'collocation', difficulty: 'foundation',
    prompt: `请选择 “${item.phrase}” 的正确含义。`,
    knowledgePointIds: [`collocation:${item.id}`],
    explanationZh: `${item.phrase}：${item.meaningZh}。例句：${item.example}`,
    sourceNote: '依据 CET-4 高频搭配编写的原创练习',
    options: options.map((text, optionIndex) => ({ id: optionId(optionIndex), text })),
    correctAnswer: optionId(correctIndex),
  };
}
export function selectDailyCollocations(
  entries: CollocationEntry[],
  states: KnowledgeState[],
  dueAt: string,
  limit = 3,
): CollocationEntry[] {
  const stateById = new Map(states.map((state) => [state.itemId, state]));
  const dueTime = Date.parse(dueAt);
  const due = entries.filter((entry) => {
    const state = stateById.get(entry.id);
    return Boolean(state && (!state.nextReviewAt || Date.parse(state.nextReviewAt) <= dueTime));
  });
  const unseen = entries.filter((entry) => !stateById.has(entry.id));
  return [...due, ...unseen].slice(0, limit);
}

export function collocationReviewCard(
  itemId: string,
  stage: number,
  nextReviewAt: string,
  correct: boolean,
  now: string,
): ReviewCard {
  return {
    id: `review:${itemId}:collocation`, questionId: `${itemId}:collocation`,
    knowledgeItemId: itemId, knowledgeKind: 'collocation', format: 'objective',
    stage, nextReviewAt, lastCorrect: correct, priority: correct ? Math.max(1, 5 - stage) : 6, updatedAt: now,
  };
}
