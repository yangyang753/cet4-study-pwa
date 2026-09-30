import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { VocabularyEntry } from '../../domain/content';
import { StrictVocabularyCheck } from './StrictVocabularyCheckView';

const words: VocabularyEntry[] = [
  { id: 'v1', word: 'passage', phonetic: '', partOfSpeech: 'n.', meaningZh: '文章，段落', example: 'Read the passage.', derivatives: [], confusables: [] },
];

describe('StrictVocabularyCheck', () => {
  it('keeps an incorrect word in place and adds its spelling to mistake review', async () => {
    const repository = {
      upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    const onComplete = vi.fn();
    render(<StrictVocabularyCheck repository={repository} words={words} states={[]} onComplete={onComplete} />);

    await userEvent.type(screen.getByLabelText('英文拼写'), 'pasage');
    await userEvent.click(screen.getByRole('button', { name: '提交并完成检测' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('已加入错题复习');
    expect(repository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({ questionId: 'v1:spelling' }));
    expect(onComplete).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText('英文拼写'));
    await userEvent.type(screen.getByLabelText('英文拼写'), 'passage');
    await userEvent.click(screen.getByRole('button', { name: '提交并完成检测' }));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('resumes at the first word not already passed and persists the next pass', async () => {
    const repository = {
      upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    const second = { ...words[0], id: 'v2', word: 'benefit', meaningZh: '好处，益处' };
    const onWordPassed = vi.fn().mockResolvedValue(undefined);
    render(<StrictVocabularyCheck repository={repository} words={[words[0], second]} states={[]}
      passedWordIds={['v1']} onWordPassed={onWordPassed} onComplete={() => undefined} />);

    expect(screen.getByText(/2 \/ 2/)).toBeVisible();
    await userEvent.type(screen.getByLabelText('完整中文词义'), '好处，益处');
    await userEvent.click(screen.getByRole('button', { name: '提交并完成检测' }));
    expect(onWordPassed).toHaveBeenCalledWith('v2');
  });

  it('does not advance the same strict pass twice when progress persistence is retried', async () => {
    const repository = {
      upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<StrictVocabularyCheck repository={repository} words={words} states={[{
      id: 'knowledge:v1', itemId: 'v1', status: 'review', favorite: false, reviewStage: 1,
      lastStrictPassedDate: '2026-09-30', updatedAt: '2026-09-30T08:00:00.000Z',
    }]} onComplete={() => undefined} />);
    await userEvent.type(screen.getByLabelText('英文拼写'), 'passage');
    await userEvent.click(screen.getByRole('button', { name: '提交并完成检测' }));
    expect(repository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ reviewStage: 1 }));
  });
});
