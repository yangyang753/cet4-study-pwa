import type { VocabularyEntry } from '../../domain/content';
import type { KnowledgeState } from '../../domain/learning';

const DAY_MS = 86_400_000;
const REVIEW_INTERVALS = [1, 3, 7, 14, 30] as const;

export interface VocabularyWorkload {
  newWords: VocabularyEntry[];
  dueWords: VocabularyEntry[];
  newWordQuota: number;
  remainingWords: number;
  projectedCompletionDate: string;
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
): VocabularyWorkload {
  const stateById = new Map(states.map((item) => [item.itemId, item]));
  const remainingWords = entries.filter((item) => stateById.get(item.id)?.status !== 'mastered').length;
  const daysRemaining = Math.max(0, Math.ceil((dateMs(examDate) - dateMs(today)) / DAY_MS));
  const learningDays = Math.max(1, daysRemaining - 14);
  const newWordQuota = remainingWords === 0 ? 0 : Math.min(20, Math.max(10, Math.ceil(remainingWords / learningDays)));
  const unseen = entries
    .filter((item) => !stateById.has(item.id))
    .sort((left, right) => (right.frequency ?? 0) - (left.frequency ?? 0));
  const dueAt = dateMs(`${today}T23:59:59.999Z`);
  const dueWords = entries
    .map((word) => ({ word, state: stateById.get(word.id) }))
    .filter((item): item is { word: VocabularyEntry; state: KnowledgeState } => Boolean(item.state))
    .filter(({ state }) => {
      if (state.status !== 'mastered' && state.status !== 'review') return false;
      return dateMs(state.nextReviewAt ?? addDays(state.updatedAt, 1)) <= dueAt;
    })
    .sort((left, right) => {
      const leftDue = dateMs(left.state.nextReviewAt ?? addDays(left.state.updatedAt, 1));
      const rightDue = dateMs(right.state.nextReviewAt ?? addDays(right.state.updatedAt, 1));
      return leftDue - rightDue || (right.word.frequency ?? 0) - (left.word.frequency ?? 0);
    })
    .slice(0, 15)
    .map(({ word }) => word);
  const studyDays = newWordQuota === 0 ? 0 : Math.ceil(remainingWords / newWordQuota);

  return {
    newWords: unseen.slice(0, newWordQuota),
    dueWords,
    newWordQuota,
    remainingWords,
    projectedCompletionDate: studyDate(addDays(today, studyDays)),
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
  const reviewStage = correct ? Math.min(4, (current.reviewStage ?? 0) + 1) : 0;
  const interval = REVIEW_INTERVALS[reviewStage];
  return {
    ...current,
    status: correct ? 'mastered' : 'review',
    reviewStage,
    nextReviewAt: addDays(now, interval),
    lastReviewedAt: now,
    lapseCount: (current.lapseCount ?? 0) + (correct ? 0 : 1),
    updatedAt: now,
  };
}
