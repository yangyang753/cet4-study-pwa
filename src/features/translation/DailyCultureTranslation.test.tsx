import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { VocabularyEntry } from '../../domain/content';
import { DailyCultureTranslation } from './DailyCultureTranslation';

const words: VocabularyEntry[] = [
  { id: 'v1', word: 'culture', phonetic: '', partOfSpeech: 'n.', meaningZh: '文化', example: '', derivatives: [], confusables: [] },
  { id: 'v2', word: 'develop', phonetic: '', partOfSpeech: 'v.', meaningZh: '发展', example: '', derivatives: [], confusables: [] },
  { id: 'v3', word: 'generation', phonetic: '', partOfSpeech: 'n.', meaningZh: '世代', example: '', derivatives: [], confusables: [] },
];
const prompt = { id: 'culture-test', theme: '文化传承', promptZh: '中国文化代代发展。', referenceAnswer: 'Chinese culture develops through generations.', targetWordIds: ['v1', 'v2', 'v3'], keyPoints: ['文化', '发展', '世代'] };

function repository(overrides = {}) {
  return {
    saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
    upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
    upsertReviewCard: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as LearningRepository;
}

describe('DailyCultureTranslation', () => {
  it('keeps English target words hidden until after submission', async () => {
    const learningRepository = repository();
    render(<DailyCultureTranslation repository={learningRepository} prompt={prompt} vocabulary={words} states={[]} date="2026-09-27" onComplete={() => undefined} />);
    expect(screen.queryByText(/目标词：culture/)).not.toBeInTheDocument();
    expect(screen.getByText(/中文提示：文化/)).toBeVisible();
    await userEvent.type(screen.getByLabelText('我的英文翻译'), 'Chinese culture develops through generations.');
    await userEvent.click(screen.getByRole('button', { name: '提交文化翻译' }));
    expect(await screen.findByText(/参考目标词：culture/)).toBeVisible();
  });

  it('demotes missed target words and adds them to review automatically', async () => {
    const learningRepository = repository();
    render(<DailyCultureTranslation repository={learningRepository} prompt={prompt} vocabulary={words} states={[]} date="2026-09-27" now="2026-09-27T08:00:00.000Z" onComplete={() => undefined} />);
    await userEvent.type(screen.getByLabelText('我的英文翻译'), 'Chinese culture is important today.');
    await userEvent.click(screen.getByRole('button', { name: '提交文化翻译' }));
    expect(await screen.findByText(/2 个目标词需要加强/)).toBeVisible();
    expect(learningRepository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'v2', status: 'review' }));
    expect(learningRepository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({ wordId: 'v3', format: 'word-cloze' }));
  });

  it('keeps the answer and stable attempt id when a save must be retried', async () => {
    const saveAttemptOnce = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const learningRepository = repository({ saveAttemptOnce });
    render(<DailyCultureTranslation repository={learningRepository} prompt={prompt} vocabulary={words} states={[]} date="2026-09-27" now="2026-09-27T08:00:00.000Z" onComplete={() => undefined} />);
    await userEvent.type(screen.getByLabelText('我的英文翻译'), 'Chinese culture develops through generations.');
    await userEvent.click(screen.getByRole('button', { name: '提交文化翻译' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
    expect(screen.getByLabelText('我的英文翻译')).toHaveValue('Chinese culture develops through generations.');
    await userEvent.click(screen.getByRole('button', { name: '重新保存翻译' }));
    expect(saveAttemptOnce).toHaveBeenCalledTimes(2);
    expect(saveAttemptOnce.mock.calls[0][0].id).toBe(saveAttemptOnce.mock.calls[1][0].id);
  });

  it('requires an incomplete translation to be corrected before continuing', async () => {
    const onComplete = vi.fn();
    render(<DailyCultureTranslation repository={repository()} prompt={prompt} vocabulary={words} states={[]} date="2026-09-27" onComplete={onComplete} />);
    await userEvent.type(screen.getByLabelText('我的英文翻译'), 'Chinese culture is important today.');
    await userEvent.click(screen.getByRole('button', { name: '提交文化翻译' }));
    expect(await screen.findByRole('button', { name: '修改后重新提交' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '继续学习重点搭配' })).not.toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: '修改后重新提交' }));
    expect(screen.getByLabelText('我的英文翻译')).toBeEnabled();
  });
});
