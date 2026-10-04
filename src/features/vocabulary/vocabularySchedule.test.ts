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
  it('uses two acquisition days followed by a dedicated consolidation day', () => {
    const entries = Array.from({ length: 90 }, (_, i) => entry(i));
    const learned = [state(0, { status: 'review', nextReviewAt: '2026-12-30T00:00:00.000Z' })];
    const firstAcquisition = buildVocabularyWorkload(entries, learned, '2026-10-02', '2026-12-12', 60, { completedVocabularySessions: 0 });
    const secondAcquisition = buildVocabularyWorkload(entries, learned, '2026-10-08', '2026-12-12', 60, { completedVocabularySessions: 1 });
    const consolidation = buildVocabularyWorkload(entries, learned, '2026-10-20', '2026-12-12', 60, { completedVocabularySessions: 2 });

    expect(firstAcquisition.reviewOnlyDay).toBe(false);
    expect(firstAcquisition.newWordQuota).toBeGreaterThan(0);
    expect(secondAcquisition.reviewOnlyDay).toBe(false);
    expect(secondAcquisition.newWordQuota).toBeGreaterThan(0);
    expect(consolidation.reviewOnlyDay).toBe(true);
    expect(consolidation.newWordQuota).toBe(0);
    expect(consolidation.dueWords.map((word) => word.id)).toContain('v0');
  });

  it('reserves acquisition capacity for new words when old reviews are due', () => {
    const entries = Array.from({ length: 120 }, (_, i) => entry(i));
    const states = Array.from({ length: 45 }, (_, i) => state(i, { nextReviewAt: '2026-09-20T00:00:00.000Z' }));
    const result = buildVocabularyWorkload(entries, states, '2026-10-02', '2026-12-12', 60);

    expect(result.reviewOnlyDay).toBe(false);
    expect(result.dueWords.length).toBeLessThan(result.dailyKnowledgeCapacity);
    expect(result.newWords.length).toBeGreaterThan(0);
  });

  it('finishes first exposure early enough to reserve at least thirty-five consolidation days', () => {
    const result = buildVocabularyWorkload(Array.from({ length: 800 }, (_, i) => entry(i)), [], '2026-09-25', '2026-12-12');
    expect(result.newWordQuota).toBeGreaterThan(19);
    expect(result.newWords).toHaveLength(result.newWordQuota);
    expect(result.remainingWords).toBe(800);
    expect(result.firstPassTargetDate).toBe('2026-11-07');
    expect(result.consolidationDays).toBe(35);
    expect(result.projectedCompletionDate).toBe('2026-11-07');
    expect(result.requiredDailyWords).toBeGreaterThan(19);
    expect(result.estimatedMinutes).toBeGreaterThan(15);
    expect(result.atRisk).toBe(false);
    expect(result.remainingReviewStages).toBe(3200);
    expect(result.requiredDailyMasteryChecks).toBeGreaterThan(40);
    expect(result.projectedMasteryDate <= '2026-12-12').toBe(true);
  });

  it('uses the available daily minutes to flag an impossible stable-mastery pace', () => {
    const result = buildVocabularyWorkload(Array.from({ length: 800 }, (_, i) => entry(i)), [], '2026-09-25', '2026-12-12', 20);
    expect(result.dailyKnowledgeCapacity).toBe(15);
    expect(result.masteryAtRisk).toBe(true);
  });

  it('uses a finite capped quota inside the consolidation window', () => {
    const result = buildVocabularyWorkload(Array.from({ length: 50 }, (_, i) => entry(i)), [], '2026-12-10', '2026-12-12');
    expect(result.newWordQuota).toBe(45);
    expect(result.newWords).toHaveLength(45);
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
    expect(result.dueWords.length).toBeLessThan(45);
    expect(result.reviewBacklog).toBeGreaterThan(0);
    expect(result.newWordQuota).toBeGreaterThan(0);
    expect(result.newWords.length).toBeGreaterThan(0);
    expect(result.dueWords[0].id).toBe('v0');
    expect(result.dueWords.at(-1)?.id).toBe(`v${result.dueWords.length - 1}`);
  });

  it('brings legacy learning words without a review date back for review', () => {
    const result = buildVocabularyWorkload([entry(1)], [state(1, {
      status: 'learning', nextReviewAt: undefined, updatedAt: '2026-09-23T00:00:00.000Z',
    })], '2026-09-25', '2026-12-12');
    expect(result.dueWords.map((word) => word.id)).toEqual(['v1']);
    expect(result.newWords).toEqual([]);
    expect(result.newWordQuota).toBe(0);
  });

  it('prioritizes unseen culture words and separately strengthens learned culture words without duplicates', () => {
    const entries = Array.from({ length: 30 }, (_, i) => entry(i));
    const result = buildVocabularyWorkload(entries, [state(2, { nextReviewAt: '2026-12-30T00:00:00.000Z' })], '2026-09-25', '2026-12-12', 60, {
      cultureWordIds: ['v20', 'v2', 'v21'],
    });
    expect(result.newWords.slice(0, 2).map((word) => word.id)).toEqual(['v20', 'v21']);
    expect(result.cultureWords.map((word) => word.id)).toEqual(['v2']);
    expect(new Set([...result.newWords, ...result.dueWords, ...result.cultureWords].map((word) => word.id)).size).toBe(
      result.newWords.length + result.dueWords.length + result.cultureWords.length,
    );
  });

  it('reserves room to teach unseen culture targets even when old-word reviews fill capacity', () => {
    const entries = Array.from({ length: 60 }, (_, i) => entry(i));
    const states = Array.from({ length: 45 }, (_, i) => state(i, { nextReviewAt: '2026-09-20T00:00:00.000Z' }));
    const result = buildVocabularyWorkload(entries, states, '2026-09-25', '2026-12-12', 60, { cultureWordIds: ['v50', 'v51', 'v52'] });
    expect(result.newWords.slice(0, 3).map((word) => word.id)).toEqual(['v50', 'v51', 'v52']);
    expect(result.dueWords.length + result.newWords.length + result.cultureWords.length).toBeLessThanOrEqual(45);
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
      status: 'review', reviewStage: 2, lapseCount: 2, nextReviewAt: '2026-10-02T08:00:00.000Z',
    });
    expect(applyVocabularyReviewResult(current, false, '2026-09-25T08:00:00.000Z')).toMatchObject({
      status: 'review', reviewStage: 0, lapseCount: 3, nextReviewAt: '2026-09-26T08:00:00.000Z',
    });
  });
});
