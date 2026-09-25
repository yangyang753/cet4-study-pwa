import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { VocabularyEntry } from '../../domain/content';
import { VocabularyWarmup } from './VocabularyWarmup';

const entries: VocabularyEntry[] = Array.from({ length: 10 }, (_, index) => ({
  id: `v${index + 1}`, word: `word${index + 1}`, phonetic: `/word${index + 1}/`, partOfSpeech: 'n.',
  meaningZh: `词义${index + 1}`, example: `Example ${index + 1}.`, exampleZh: `例句${index + 1}。`, derivatives: [], confusables: [],
}));

function repository(overrides = {}) {
  return {
    getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [] }),
    upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as LearningRepository;
}

describe('VocabularyWarmup', () => {
  it('shows the English side before revealing the meaning', async () => {
    render(<VocabularyWarmup repository={repository()} entries={entries} onComplete={() => undefined} />);
    expect(await screen.findByRole('heading', { name: 'word1' })).toBeVisible();
    expect(screen.queryByText('词义1')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '显示释义' }));
    expect(screen.getByText('词义1')).toBeVisible();
  });

  it('saves unknown and recognized words without claiming mastery and preserves favorite', async () => {
    const learningRepository = repository({
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:v1', itemId: 'v1', status: 'review', favorite: true, updatedAt: '2026-09-24T00:00:00.000Z' },
      ] }),
    });
    render(<VocabularyWarmup repository={learningRepository} entries={entries.slice(0, 2)} onComplete={() => undefined} />);

    await userEvent.click(await screen.findByRole('button', { name: '显示释义' }));
    await userEvent.click(screen.getByRole('button', { name: '还不会' }));
    expect(learningRepository.upsertKnowledgeState).toHaveBeenNthCalledWith(1, expect.objectContaining({ itemId: 'v1', status: 'review', favorite: true }));

    await userEvent.click(screen.getByRole('button', { name: '显示释义' }));
    await userEvent.click(screen.getByRole('button', { name: '基本认识' }));
    expect(learningRepository.upsertKnowledgeState).toHaveBeenNthCalledWith(2, expect.objectContaining({ itemId: 'v2', status: 'learning', favorite: false }));
  });

  it('keeps the current word and retries when saving fails', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline storage')).mockResolvedValueOnce(undefined);
    const learningRepository = repository({ upsertKnowledgeState: save });
    render(<VocabularyWarmup repository={learningRepository} entries={entries.slice(0, 1)} onComplete={() => undefined} />);

    await userEvent.click(await screen.findByRole('button', { name: '显示释义' }));
    await userEvent.click(screen.getByRole('button', { name: '还不会' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
    expect(screen.getByRole('heading', { name: 'word1' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '重新保存' }));
    expect(await screen.findByText('单词热身完成')).toBeVisible();
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('moves to questions only after all ten word decisions are saved', async () => {
    const onComplete = vi.fn();
    render(<VocabularyWarmup repository={repository()} entries={entries} onComplete={onComplete} />);
    for (let index = 0; index < 10; index += 1) {
      await userEvent.click(await screen.findByRole('button', { name: '显示释义' }));
      await userEvent.click(screen.getByRole('button', { name: '基本认识' }));
    }
    expect(onComplete).toHaveBeenCalledOnce();
    expect(screen.getByText('单词热身完成')).toBeVisible();
  });
});
