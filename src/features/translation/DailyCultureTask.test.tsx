import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { VocabularyEntry } from '../../domain/content';
import { DailyCultureTask } from './DailyCultureTask';

const words: VocabularyEntry[] = [
  { id: 'v1', word: 'culture', phonetic: '', partOfSpeech: 'n.', meaningZh: '文化', example: 'Culture matters.', derivatives: [], confusables: [] },
  { id: 'v2', word: 'develop', phonetic: '', partOfSpeech: 'v.', meaningZh: '发展', example: 'Societies develop.', derivatives: [], confusables: [] },
];
const prompts = [{ id: 'culture-test', theme: '文化发展', promptZh: '中国文化不断发展，并帮助不同社会增进相互理解。', referenceAnswer: 'Chinese culture continues to develop and helps different societies improve mutual understanding.', targetWordIds: ['v1', 'v2'], keyPoints: ['文化', '发展'] }];

function repository(phase: 'testing' | 'complete') {
  return {
    getPlan: vi.fn().mockResolvedValue({ id: 'plan:2026-09-27', date: '2026-09-27', tasks: [], vocabularySession: { wordIds: ['v1', 'v2'], learnedWordIds: ['v1', 'v2'], phase }, updatedAt: '2026-09-27T08:00:00.000Z' }),
    savePlan: vi.fn().mockResolvedValue(undefined),
    getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [], attempts: [], dueReviews: [], completions: [], settings: { id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-27T08:00:00.000Z' } }),
    saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
    upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
    upsertReviewCard: vi.fn().mockResolvedValue(undefined),
    completeTask: vi.fn().mockResolvedValue(undefined),
  } as unknown as LearningRepository;
}

describe('DailyCultureTask', () => {
  it('stays locked until the separate vocabulary task is complete', async () => {
    render(<DailyCultureTask repository={repository('testing')} today="2026-09-27" vocabulary={words} prompts={prompts} />);
    expect(await screen.findByRole('heading', { name: '先完成今日高频词' })).toBeVisible();
    expect(screen.queryByLabelText('我的英文翻译')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回学习高频词' })).toHaveAttribute('href', expect.stringContaining('practice/vocabulary'));
  });

  it('opens as an independent translation task after vocabulary passes', async () => {
    render(<DailyCultureTask repository={repository('complete')} today="2026-09-27" vocabulary={words} prompts={prompts} />);
    expect(await screen.findByLabelText('我的英文翻译')).toBeVisible();
    await userEvent.type(screen.getByLabelText('我的英文翻译'), 'Chinese culture continues to develop and helps different societies improve mutual understanding.');
    await userEvent.click(screen.getByRole('button', { name: '提交文化翻译' }));
    expect(await screen.findByRole('button', { name: '完成今日文化翻译' })).toBeVisible();
  });

  it('backfills the independent culture completion for a legacy passed session', async () => {
    const learningRepository = repository('complete');
    vi.mocked(learningRepository.getPlan).mockResolvedValueOnce({
      id: 'plan:2026-09-27', date: '2026-09-27', tasks: [],
      vocabularySession: { wordIds: ['v1', 'v2'], learnedWordIds: ['v1', 'v2'], phase: 'complete', culturePassed: true },
      updatedAt: '2026-09-27T08:00:00.000Z',
    });
    render(<DailyCultureTask repository={learningRepository} today="2026-09-27" vocabulary={words} prompts={prompts} />);
    expect(await screen.findByRole('heading', { name: '今日中国文化翻译已完成' })).toBeVisible();
    expect(learningRepository.completeTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: '2026-09-27:culture', kind: 'culture' }));
    expect(learningRepository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ itemId: '2026-09-27:culture', status: 'mastered' }));
  });
});
