import type { KnowledgeState, ReviewCard } from '../../domain/learning';
import { applyVocabularyReviewResult } from './vocabularySchedule';

function baseState(current: KnowledgeState | undefined, wordId: string, now: string): KnowledgeState {
  return current ?? {
    id: `knowledge:${wordId}`,
    itemId: wordId,
    status: 'learning',
    favorite: false,
    reviewStage: 0,
    lapseCount: 0,
    updatedAt: now,
  };
}

export function recordTranslationResult(
  current: KnowledgeState | undefined,
  wordId: string,
  covered: boolean,
  now: string,
): KnowledgeState {
  const state = baseState(current, wordId, now);
  if (!covered) return applyVocabularyReviewResult(state, false, now);
  if (state.status === 'mastered') return { ...state, lastReviewedAt: now, updatedAt: now };
  return { ...state, status: 'learning', lastReviewedAt: now, updatedAt: now };
}

export function recordMeaningResult(
  current: KnowledgeState | undefined,
  wordId: string,
  correct: boolean,
  now: string,
): KnowledgeState {
  return applyVocabularyReviewResult(baseState(current, wordId, now), correct, now);
}

export function recordSpellingResult(
  current: KnowledgeState | undefined,
  wordId: string,
  correct: boolean,
  now: string,
): KnowledgeState {
  const state = baseState(current, wordId, now);
  if (!correct) return applyVocabularyReviewResult(state, false, now);
  if (state.status === 'mastered') return applyVocabularyReviewResult(state, true, now);
  return { ...state, status: 'learning', lastReviewedAt: now, updatedAt: now };
}

export function vocabularyReviewCard(
  wordId: string,
  kind: 'meaning' | 'cloze',
  now: string,
): ReviewCard {
  return {
    id: `review:${wordId}:${kind === 'cloze' ? 'spelling' : 'meaning'}`,
    questionId: `${wordId}:${kind === 'cloze' ? 'spelling' : 'meaning'}`,
    wordId,
    format: kind === 'cloze' ? 'word-cloze' : 'objective',
    stage: 0,
    priority: 6,
    nextReviewAt: now,
    lastCorrect: false,
    updatedAt: now,
  };
}
