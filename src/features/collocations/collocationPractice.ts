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
  return normalizeRecall(response) === normalizeRecall(exercise.answer);
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
