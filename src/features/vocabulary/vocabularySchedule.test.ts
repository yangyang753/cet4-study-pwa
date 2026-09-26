import { describe, expect, it } from 'vitest';
import type { VocabularyEntry } from '../../domain/content';
import type { KnowledgeState } from '../../domain/learning';
import { applyVocabularyReviewResult, buildVocabularyWorkload, buildWordCloze } from './vocabularySchedule';

const entry = (index: number, word = `word${index}`): VocabularyEntry => ({
  id: `v${index}`, word, phonetic: '', partOfSpeech: 'n.', meaningZh: `词义${index}`,
  example: '', derivatives: [], confusables: [], frequency: 1000 - index,
});

const state = (index: number, extra: Partial<KnowledgeState> = {}): KnowledgeState => ({
  id: `knowledge:v${index}`, itemId: `v${index}`, status: 'mastered', favorite: false,
  updatedAt: '2026-09-20T00:00:00.000Z', ...extra,
});

describe('vocabulary workload', () => {
  it('reserves fourteen days and assigns thirteen of 800 unmastered words', () => {
    const result = buildVocabularyWorkload(Array.from({ length: 800 }, (_, i) => entry(i)), [], '2026-09-25', '2026-12-12');
    expect(result.newWordQuota).toBe(13);
    expect(result.newWords).toHaveLength(13);
    expect(result.remainingWords).toBe(800);
    expect(result.projectedCompletionDate).toBe('2026-11-26');
    expect(result.requiredDailyWords).toBe(13);
    expect(result.estimatedMinutes).toBeGreaterThan(15);
    expect(result.atRisk).toBe(false);
  });

  it('uses a finite capped quota inside the consolidation window', () => {
    const result = buildVocabularyWorkload(Array.from({ length: 50 }, (_, i) => entry(i)), [], '2026-12-10', '2026-12-12');
    expect(result.newWordQuota).toBe(20);
    expect(result.newWords).toHaveLength(20);
    expect(result.requiredDailyWords).toBe(50);
    expect(result.atRisk).toBe(true);
  });

  it('assigns no new words when every word is mastered', () => {
    const entries = Array.from({ length: 20 }, (_, i) => entry(i));
    const result = buildVocabularyWorkload(entries, entries.map((_, i) => state(i)), '2026-09-25', '2026-12-12');
    expect(result.newWordQuota).toBe(0);
    expect(result.newWords).toEqual([]);
    expect(result.remainingWords).toBe(0);
  });

  it('reports the full due backlog and pauses new words when review fills the daily capacity', () => {
    const entries = Array.from({ length: 45 }, (_, i) => entry(i));
    const states = entries.map((_, i) => state(i, { nextReviewAt: new Date(Date.UTC(2026, 6, 1 + i)).toISOString() }));
    const result = buildVocabularyWorkload([...entries, ...Array.from({ length: 30 }, (_, i) => entry(i + 100))], states, '2026-10-31', '2026-12-12');
    expect(result.dueWordCount).toBe(45);
    expect(result.dueWords).toHaveLength(20);
    expect(result.reviewBacklog).toBe(25);
    expect(result.newWordQuota).toBe(0);
    expect(result.newWords).toHaveLength(0);
    expect(result.dueWords[0].id).toBe('v0');
    expect(result.dueWords[19].id).toBe('v19');
  });

  it('brings legacy learning words without a review date back for review', () => {
    const result = buildVocabularyWorkload([entry(1)], [state(1, {
      status: 'learning', nextReviewAt: undefined, updatedAt: '2026-09-23T00:00:00.000Z',
    })], '2026-09-25', '2026-12-12');
    expect(result.dueWords.map((word) => word.id)).toEqual(['v1']);
    expect(result.newWords).toEqual([]);
    expect(result.newWordQuota).toBe(0);
  });
});

describe('word cloze and review state', () => {
  it('uses a partial cloze early and a full cloze at later stages', () => {
    expect(buildWordCloze('passage', 0)).toBe('p_s_a_e');
    expect(buildWordCloze('passage', 3)).toBe('_______');
  });

  it('advances a correct word and resets an incorrect word', () => {
    const current = state(1, { status: 'review', reviewStage: 1, lapseCount: 2 });
    expect(applyVocabularyReviewResult(current, true, '2026-09-25T08:00:00.000Z')).toMatchObject({
      status: 'mastered', reviewStage: 2, lapseCount: 2, nextReviewAt: '2026-10-02T08:00:00.000Z',
    });
    expect(applyVocabularyReviewResult(current, false, '2026-09-25T08:00:00.000Z')).toMatchObject({
      status: 'review', reviewStage: 0, lapseCount: 3, nextReviewAt: '2026-09-26T08:00:00.000Z',
    });
  });
});
