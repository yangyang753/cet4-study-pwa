import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { VocabularyEntry } from '../../domain/content';
import { VocabularyTranslationCheck } from './VocabularyTranslationCheck';

const words: VocabularyEntry[] = [
  { id: 'v1', word: 'passage', phonetic: '', partOfSpeech: 'n.', meaningZh: '文章，段落', example: 'Read the passage carefully.', derivatives: [], confusables: [] },
  { id: 'v2', word: 'benefit', phonetic: '', partOfSpeech: 'n.', meaningZh: '好处，益处', example: 'Exercise has a clear benefit.', derivatives: [], confusables: [] },
];

function repository(overrides = {}) {
  return {
    upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
    upsertReviewCard: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as LearningRepository;
}

describe('VocabularyTranslationCheck', () => {
  it('marks covered words mastered and sends missed words to wrong-question review', async () => {
    const learningRepository = repository();
    render(<VocabularyTranslationCheck repository={learningRepository} words={words} now="2026-09-25T08:00:00.000Z" onComplete={() => undefined} />);
    await userEvent.type(screen.getByLabelText('我的中文翻译'), '请仔细阅读这篇文章。');
    await userEvent.click(screen.getByRole('button', { name: '检查翻译' }));

    expect(await screen.findByText(/1 个词义需要加强/)).toBeVisible();
    expect(learningRepository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'v1', status: 'mastered' }));
    expect(learningRepository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'v2', status: 'review' }));
    expect(learningRepository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({ questionId: 'v2:meaning', lastCorrect: false }));
  });

  it('keeps the translation for retry when persistence fails', async () => {
    const learningRepository = repository({ upsertKnowledgeState: vi.fn().mockRejectedValue(new Error('storage')) });
    render(<VocabularyTranslationCheck repository={learningRepository} words={words.slice(0, 1)} now="2026-09-25T08:00:00.000Z" onComplete={() => undefined} />);
    await userEvent.type(screen.getByLabelText('我的中文翻译'), '文章');
    await userEvent.click(screen.getByRole('button', { name: '检查翻译' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
    expect(screen.getByLabelText('我的中文翻译')).toHaveValue('文章');
  });
});
