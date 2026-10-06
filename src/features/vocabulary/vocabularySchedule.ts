import type { VocabularyEntry, VocabularyLayer } from '../../domain/content';
import type { KnowledgeState } from '../../domain/learning';
import { applyKnowledgeReviewResult } from '../mastery/knowledgeMastery';
import { vocabularyLayerOf } from './vocabularyLayer';

const DAY_MS = 86_400_000;
const STABLE_REVIEW_SPACING_DAYS = 24;

export interface VocabularyWorkload {
  newWords: VocabularyEntry[];
  dueWords: VocabularyEntry[];
  cultureWords: VocabularyEntry[];
  dueWordCount: number;
  reviewBacklog: number;
  newWordQuota: number;
  remainingWords: number;
  unseenWordCount: number;
  unstableWordCount: number;
  projectedCompletionDate: string;
  firstPassTargetDate: string;
  consolidationDays: number;
  requiredDailyWords: number;
  estimatedMinutes: number;
  atRisk: boolean;
  remainingReviewStages: number;
  requiredDailyMasteryChecks: number;
  projectedMasteryDate: string;
  dailyKnowledgeCapacity: number;
  masteryAtRisk: boolean;
  reviewOnlyDay: boolean;
  acquisitionDays: number;
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

function isReviewCycleSession(completedVocabularySessions: number): boolean {
  return Math.max(0, completedVocabularySessions) % 2 === 1;
}

function acquisitionDayCount(days: number, completedVocabularySessions: number): number {
  let total = 0;
  for (let offset = 0; offset < days; offset += 1) {
    if (!isReviewCycleSession(completedVocabularySessions + offset)) total += 1;
  }
  return Math.max(1, total);
}

function calendarDaysForAcquisitionSessions(sessions: number, completedVocabularySessions: number): number {
  let completed = 0;
  let offset = 0;
  while (completed < sessions) {
    if (!isReviewCycleSession(completedVocabularySessions + offset)) completed += 1;
    offset += 1;
  }
  return offset;
}

export function buildVocabularyWorkload(
  entries: VocabularyEntry[],
  states: KnowledgeState[],
  today: string,
  examDate: string,
  dailyMinutes = 60,
  options: { cultureWordIds?: string[]; completedVocabularySessions?: number; layer?: VocabularyLayer } = {},
): VocabularyWorkload {
  const scopedEntries = options.layer ? entries.filter((entry) => vocabularyLayerOf(entry.id) === options.layer) : entries;
  const stateById = new Map(states.map((item) => [item.itemId, item]));
  const unstableWordCount = scopedEntries.filter((item) => stateById.get(item.id)?.status !== 'mastered').length;
  const cultureWordIds = new Set(options.cultureWordIds ?? []);
  const unseen = scopedEntries
    .filter((item) => !stateById.has(item.id))
    .sort((left, right) => Number(cultureWordIds.has(right.id)) - Number(cultureWordIds.has(left.id)) || (right.frequency ?? 0) - (left.frequency ?? 0));
  const unseenWordCount = unseen.length;
  const remainingWords = unseenWordCount;
  const daysRemaining = Math.max(0, Math.ceil((dateMs(examDate) - dateMs(today)) / DAY_MS));
  const consolidationDays = Math.max(0, Math.min(
    Math.max(0, daysRemaining - 1),
    daysRemaining >= 60 ? 35 : Math.max(STABLE_REVIEW_SPACING_DAYS, Math.floor(daysRemaining * 0.45)),
  ));
  const learningDays = Math.max(1, daysRemaining - consolidationDays);
  const completedVocabularySessions = Math.max(0, options.completedVocabularySessions ?? 0);
  const acquisitionDays = acquisitionDayCount(learningDays, completedVocabularySessions);
  const firstPassTargetDate = studyDate(addDays(examDate, -consolidationDays));
  const dailyKnowledgeCapacity = Math.max(10, Math.min(45, Math.floor(dailyMinutes * 0.75)));
  const hasLearnedVocabulary = scopedEntries.some((entry) => stateById.has(entry.id));
  const scheduledReviewOnlyDay = hasLearnedVocabulary && isReviewCycleSession(completedVocabularySessions);
  const requiredDailyWords = unseen.length === 0 ? 0 : Math.ceil(unseen.length / acquisitionDays);
  const baseNewWordQuota = unseen.length === 0 ? 0 : Math.min(dailyKnowledgeCapacity, Math.max(10, requiredDailyWords));
  const dueAt = dateMs(`${today}T23:59:59.999Z`);
  const allDueWords = scopedEntries
    .map((word) => ({ word, state: stateById.get(word.id) }))
    .filter((item): item is { word: VocabularyEntry; state: KnowledgeState } => Boolean(item.state))
    .filter(({ state }) => dateMs(state.nextReviewAt ?? addDays(state.updatedAt, 1)) <= dueAt)
    .sort((left, right) => {
      const leftDue = dateMs(left.state.nextReviewAt ?? addDays(left.state.updatedAt, 1));
      const rightDue = dateMs(right.state.nextReviewAt ?? addDays(right.state.updatedAt, 1));
      return leftDue - rightDue || (right.word.frequency ?? 0) - (left.word.frequency ?? 0);
    })
    .map(({ word }) => word);
  const reviewOnlyDay = scheduledReviewOnlyDay || allDueWords.length > dailyKnowledgeCapacity * 1.5;
  const unseenCultureWordCount = unseen.filter((word) => cultureWordIds.has(word.id)).length;
  const learnedNotDue = scopedEntries
    .map((word) => ({ word, state: stateById.get(word.id) }))
    .filter((item): item is { word: VocabularyEntry; state: KnowledgeState } => Boolean(item.state) && !allDueWords.some((word) => word.id === item.word.id))
    .sort((left, right) => (right.state.lapseCount ?? 0) - (left.state.lapseCount ?? 0) || dateMs(left.state.updatedAt) - dateMs(right.state.updatedAt))
    .map(({ word }) => word);
  const precedingDate = studyDate(addDays(today, -1));
  const precedingDayWords = scopedEntries.filter((word) => {
    const updatedAt = stateById.get(word.id)?.updatedAt;
    return Boolean(updatedAt && studyDate(updatedAt) === precedingDate);
  });
  const reviewPool = reviewOnlyDay
    ? [...new Map([...precedingDayWords, ...allDueWords, ...learnedNotDue].map((word) => [word.id, word])).values()]
    : allDueWords;
  const acquisitionReviewCap = Math.max(8, Math.min(Math.floor(dailyKnowledgeCapacity * 0.4), dailyKnowledgeCapacity - baseNewWordQuota));
  const reviewCapacity = reviewOnlyDay ? dailyKnowledgeCapacity : Math.max(0, acquisitionReviewCap);
  const dueWords = reviewPool.slice(0, Math.max(0, reviewCapacity - unseenCultureWordCount));
  const occupied = new Set(dueWords.map((word) => word.id));
  const cultureWords = scopedEntries.filter((word) => cultureWordIds.has(word.id) && stateById.has(word.id) && !occupied.has(word.id));
  const dueWordCount = allDueWords.length;
  const reviewBacklog = Math.max(0, dueWordCount - dueWords.filter((word) => allDueWords.some((due) => due.id === word.id)).length);
  const newWordQuota = reviewOnlyDay || dueWords.length + cultureWords.length >= dailyKnowledgeCapacity ? 0 : Math.min(baseNewWordQuota, dailyKnowledgeCapacity - dueWords.length - cultureWords.length);
  const sustainableNewWordQuota = unseen.length === 0 ? 0 : Math.min(dailyKnowledgeCapacity, Math.max(10, requiredDailyWords));
  const studySessions = sustainableNewWordQuota === 0 ? 0 : Math.ceil(unseen.length / sustainableNewWordQuota);
  const studyDays = calendarDaysForAcquisitionSessions(studySessions, completedVocabularySessions);
  const projectedCompletionDate = studyDate(addDays(today, studyDays));
  const estimatedMinutes = Math.min(dailyMinutes, Math.max(10, Math.ceil(newWordQuota * 1.2 + dueWords.length * 0.5 + 5)));
  const remainingReviewStages = scopedEntries.reduce((total, item) => {
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
    cultureWords,
    dueWordCount,
    reviewBacklog,
    newWordQuota,
    remainingWords,
    unseenWordCount,
    unstableWordCount,
    projectedCompletionDate,
    firstPassTargetDate,
    consolidationDays,
    requiredDailyWords,
    estimatedMinutes,
    atRisk: unseen.length > 0 && (requiredDailyWords > dailyKnowledgeCapacity || projectedCompletionDate > firstPassTargetDate),
    remainingReviewStages,
    requiredDailyMasteryChecks,
    projectedMasteryDate,
    dailyKnowledgeCapacity,
    masteryAtRisk,
    reviewOnlyDay,
    acquisitionDays,
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
