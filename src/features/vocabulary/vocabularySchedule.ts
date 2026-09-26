import type { VocabularyEntry } from '../../domain/content';
import type { KnowledgeState } from '../../domain/learning';
import { applyKnowledgeReviewResult } from '../mastery/knowledgeMastery';

const DAY_MS = 86_400_000;
const STABLE_REVIEW_SPACING_DAYS = 24;

export interface VocabularyWorkload {
  newWords: VocabularyEntry[];
  dueWords: VocabularyEntry[];
  dueWordCount: number;
  reviewBacklog: number;
  newWordQuota: number;
  remainingWords: number;
  projectedCompletionDate: string;
  requiredDailyWords: number;
  estimatedMinutes: number;
  atRisk: boolean;
  remainingReviewStages: number;
  requiredDailyMasteryChecks: number;
  projectedMasteryDate: string;
  dailyKnowledgeCapacity: number;
  masteryAtRisk: boolean;
}

function dateMs(value: string): number {
  return Date.parse(value.length === 10 ? `${value}T00:00:00.000Z` : value);
}

function addDays(value: string, days: number): string {
  return new Date(dateMs(value) + days * DAY_MS).toISOString();
}

function studyDate(value: string): string {
  return new Date(dateMs(value)).toISOString().slice(0, 10);
}

export function buildVocabularyWorkload(
  entries: VocabularyEntry[],
  states: KnowledgeState[],
  today: string,
  examDate: string,
  dailyMinutes = 60,
): VocabularyWorkload {
  const stateById = new Map(states.map((item) => [item.itemId, item]));
  const remainingWords = entries.filter((item) => stateById.get(item.id)?.status !== 'mastered').length;
  const unseen = entries
    .filter((item) => !stateById.has(item.id))
    .sort((left, right) => (right.frequency ?? 0) - (left.frequency ?? 0));
  const daysRemaining = Math.max(0, Math.ceil((dateMs(examDate) - dateMs(today)) / DAY_MS));
  const learningDays = Math.max(1, daysRemaining - STABLE_REVIEW_SPACING_DAYS);
  const dailyKnowledgeCapacity = Math.max(10, Math.min(45, Math.floor(dailyMinutes * 0.75)));
  const requiredDailyWords = unseen.length === 0 ? 0 : Math.ceil(unseen.length / learningDays);
  const baseNewWordQuota = unseen.length === 0 ? 0 : Math.min(dailyKnowledgeCapacity, Math.max(10, requiredDailyWords));
  const dueAt = dateMs(`${today}T23:59:59.999Z`);
  const allDueWords = entries
    .map((word) => ({ word, state: stateById.get(word.id) }))
    .filter((item): item is { word: VocabularyEntry; state: KnowledgeState } => Boolean(item.state))
    .filter(({ state }) => dateMs(state.nextReviewAt ?? addDays(state.updatedAt, 1)) <= dueAt)
    .sort((left, right) => {
      const leftDue = dateMs(left.state.nextReviewAt ?? addDays(left.state.updatedAt, 1));
      const rightDue = dateMs(right.state.nextReviewAt ?? addDays(right.state.updatedAt, 1));
      return leftDue - rightDue || (right.word.frequency ?? 0) - (left.word.frequency ?? 0);
    })
    .map(({ word }) => word);
  const dueWords = allDueWords.slice(0, dailyKnowledgeCapacity);
  const dueWordCount = allDueWords.length;
  const reviewBacklog = Math.max(0, dueWordCount - dueWords.length);
  const newWordQuota = dueWords.length >= dailyKnowledgeCapacity ? 0 : Math.min(baseNewWordQuota, dailyKnowledgeCapacity - dueWords.length);
  const sustainableNewWordQuota = unseen.length === 0 ? 0 : Math.min(dailyKnowledgeCapacity, Math.max(10, requiredDailyWords));
  const studyDays = sustainableNewWordQuota === 0 ? 0 : Math.ceil(unseen.length / sustainableNewWordQuota);
  const projectedCompletionDate = studyDate(addDays(today, studyDays));
  const estimatedMinutes = Math.min(dailyMinutes, Math.max(10, Math.ceil(newWordQuota * 1.2 + dueWords.length * 0.5 + 5)));
  const remainingReviewStages = entries.reduce((total, item) => {
    const current = stateById.get(item.id);
    if (current?.status === 'mastered') return total;
    return total + Math.max(0, 4 - (current?.reviewStage ?? 0));
  }, 0);
  const requiredDailyMasteryChecks = remainingReviewStages === 0 ? 0 : Math.ceil(remainingReviewStages / Math.max(1, daysRemaining));
  const masteryStudyDays = remainingReviewStages === 0 ? 0 : Math.ceil(remainingReviewStages / dailyKnowledgeCapacity);
  const throughputMasteryDate = studyDate(addDays(today, masteryStudyDays));
  const spacedMasteryDate = unseen.length === 0
    ? studyDate(today)
    : studyDate(addDays(projectedCompletionDate, STABLE_REVIEW_SPACING_DAYS));
  const projectedMasteryDate = throughputMasteryDate > spacedMasteryDate ? throughputMasteryDate : spacedMasteryDate;
  const masteryAtRisk = remainingReviewStages > 0
    && (requiredDailyMasteryChecks > dailyKnowledgeCapacity || projectedMasteryDate > examDate);

  return {
    newWords: unseen.slice(0, newWordQuota),
    dueWords,
    dueWordCount,
    reviewBacklog,
    newWordQuota,
    remainingWords,
    projectedCompletionDate,
    requiredDailyWords,
    estimatedMinutes,
    atRisk: unseen.length > 0 && (requiredDailyWords > dailyKnowledgeCapacity || projectedCompletionDate > examDate),
    remainingReviewStages,
    requiredDailyMasteryChecks,
    projectedMasteryDate,
    dailyKnowledgeCapacity,
    masteryAtRisk,
  };
}

export function buildWordCloze(word: string, stage: number): string {
  if (stage >= 3) return '_'.repeat(word.length);
  return [...word].map((letter, index) => index % 2 === 0 && /[a-z]/i.test(letter) ? letter : /[a-z]/i.test(letter) ? '_' : letter).join('');
}

export function applyVocabularyReviewResult(
  current: KnowledgeState,
  correct: boolean,
  now: string,
): KnowledgeState {
  return applyKnowledgeReviewResult(current, current.itemId, correct, now);
}
