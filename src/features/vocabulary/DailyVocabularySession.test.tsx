import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { VocabularyEntry } from '../../domain/content';
import { DailyVocabularySession } from './DailyVocabularySession';

const entries: VocabularyEntry[] = [
  { id: 'v1', word: 'passage', phonetic: '', partOfSpeech: 'n.', meaningZh: '文章，段落', example: 'Read the passage.', derivatives: [], confusables: [] },
  { id: 'v2', word: 'benefit', phonetic: '', partOfSpeech: 'n.', meaningZh: '好处，益处', example: 'It has a benefit.', derivatives: [], confusables: [] },
];

function repository() {
  return {
    getDashboardSnapshot: vi.fn().mockResolvedValue({
      knowledgeStates: [{ id: 'knowledge:v1', itemId: 'v1', status: 'mastered', favorite: false, reviewStage: 0, nextReviewAt: '2026-09-24T00:00:00.000Z', updatedAt: '2026-09-23T00:00:00.000Z' }],
      settings: { id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-20T00:00:00.000Z' },
      attempts: [], dueReviews: [], completions: [],
    }),
    upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
    upsertReviewCard: vi.fn().mockResolvedValue(undefined),
  } as unknown as LearningRepository;
}

describe('DailyVocabularySession', () => {
  it('tests due old words before showing a new word', async () => {
    const learningRepository = repository();
    render(<DailyVocabularySession repository={learningRepository} entries={entries} today="2026-09-25" examDate="2026-12-12" onComplete={() => undefined} />);
    expect(await screen.findByRole('heading', { name: '先复习旧词' })).toBeVisible();
    expect(screen.getByText('p_s_a_e')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'benefit' })).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('补全单词'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: '提交旧词复习' }));
    expect(await screen.findByRole('heading', { name: 'benefit' })).toBeVisible();
    expect(learningRepository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({ questionId: 'v1:meaning' }));
  });

  it('does not advance an old word when saving fails', async () => {
    const learningRepository = repository();
    vi.mocked(learningRepository.upsertKnowledgeState).mockRejectedValueOnce(new Error('storage'));
    render(<DailyVocabularySession repository={learningRepository} entries={entries} today="2026-09-25" examDate="2026-12-12" onComplete={() => undefined} />);
    await userEvent.type(await screen.findByLabelText('补全单词'), 'passage');
    await userEvent.click(screen.getByRole('button', { name: '提交旧词复习' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
    expect(screen.getByText('p_s_a_e')).toBeVisible();
  });

  it('allows a forgotten word to be sent directly to review', async () => {
    const learningRepository = repository();
    render(<DailyVocabularySession repository={learningRepository} entries={entries} today="2026-09-25" examDate="2026-12-12" onComplete={() => undefined} />);
    await userEvent.click(await screen.findByRole('button', { name: '想不起来，加入错题' }));
    expect(await screen.findByRole('heading', { name: 'benefit' })).toBeVisible();
    expect(learningRepository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({ questionId: 'v1:meaning' }));
  });
});
