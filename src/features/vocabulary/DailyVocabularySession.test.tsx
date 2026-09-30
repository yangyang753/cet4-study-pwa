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
  it('resumes culture target review after words already passed in the saved session', async () => {
    const learningRepository = repository();
    vi.mocked(learningRepository.getDashboardSnapshot).mockResolvedValueOnce({
      knowledgeStates: entries.map((item) => ({ id: `knowledge:${item.id}`, itemId: item.id, status: 'mastered' as const, favorite: false, reviewStage: 4, updatedAt: '2026-09-25T08:00:00.000Z' })),
      settings: { id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-20T00:00:00.000Z' }, attempts: [], dueReviews: [], completions: [],
    });
    Object.assign(learningRepository, {
      getPlan: vi.fn().mockResolvedValue({ id: 'plan:2026-09-25', date: '2026-09-25', tasks: [], vocabularySession: { wordIds: [], learnedWordIds: [], strictPassedWordIds: [], passedCultureReviewWordIds: ['v1'], phase: 'culture-review' }, updatedAt: '2026-09-25T08:00:00.000Z' }),
      savePlan: vi.fn().mockResolvedValue(undefined),
    });
    const culturePrompts = [{ id: 'test', theme: '测试', promptZh: '文章带来益处。', referenceAnswer: 'A passage brings a benefit.', targetWordIds: ['v1', 'v2'], keyPoints: ['文章', '益处'] }];
    render(<DailyVocabularySession repository={learningRepository} entries={entries} culturePrompts={culturePrompts} today="2026-09-25" examDate="2026-12-12" onComplete={() => undefined} />);
    expect(await screen.findByText(/翻译强化词 · 2\/2/)).toBeVisible();
    expect(screen.getByText('_______')).toBeVisible();
  });

  it('skips a culture translation that already passed before refresh', async () => {
    const learningRepository = repository();
    vi.mocked(learningRepository.getDashboardSnapshot).mockResolvedValueOnce({
      knowledgeStates: [], settings: { id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-20T00:00:00.000Z' }, attempts: [], dueReviews: [], completions: [],
    });
    Object.assign(learningRepository, {
      getPlan: vi.fn().mockResolvedValue({ id: 'plan:2026-09-25', date: '2026-09-25', tasks: [], vocabularySession: { wordIds: [], learnedWordIds: [], culturePassed: true, phase: 'culture-translation' }, updatedAt: '2026-09-25T08:00:00.000Z' }),
      savePlan: vi.fn().mockResolvedValue(undefined),
    });
    render(<DailyVocabularySession repository={learningRepository} entries={entries} today="2026-09-25" examDate="2026-12-12" onComplete={() => undefined} />);
    expect(await screen.findByRole('heading', { name: '单词之后学习重点搭配' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: '中国文化翻译' })).not.toBeInTheDocument();
  });
  it('reuses the saved daily word cohort instead of selecting a fresh batch', async () => {
    const learningRepository = repository();
    vi.mocked(learningRepository.getDashboardSnapshot).mockResolvedValueOnce({
      knowledgeStates: entries.map((item) => ({ id: `knowledge:${item.id}`, itemId: item.id, status: 'learning' as const, favorite: false, updatedAt: '2026-09-25T08:00:00.000Z' })),
      settings: { id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-20T00:00:00.000Z' }, attempts: [], dueReviews: [], completions: [],
    });
    Object.assign(learningRepository, {
      getPlan: vi.fn().mockResolvedValue({ id: 'plan:2026-09-25', date: '2026-09-25', tasks: [], vocabularySession: { wordIds: ['v1', 'v2'], learnedWordIds: ['v1', 'v2'], strictPassedWordIds: ['v1'], phase: 'testing' }, updatedAt: '2026-09-25T08:00:00.000Z' }),
      savePlan: vi.fn().mockResolvedValue(undefined),
    });
    render(<DailyVocabularySession repository={learningRepository} entries={entries} today="2026-09-25" examDate="2026-12-12" onComplete={() => undefined} />);
    expect(await screen.findByRole('heading', { name: '严格检测今日新词' })).toBeVisible();
    expect(screen.getByText(/2 \/ 2/)).toBeVisible();
  });
  it('tests a learned culture target before opening the culture translation', async () => {
    const learningRepository = repository();
    vi.mocked(learningRepository.getDashboardSnapshot).mockResolvedValueOnce({
      knowledgeStates: entries.map((item) => ({ id: `knowledge:${item.id}`, itemId: item.id, status: 'mastered' as const, favorite: false, reviewStage: 4, nextReviewAt: '2026-12-20T00:00:00.000Z', updatedAt: '2026-09-23T00:00:00.000Z' })),
      settings: { id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-20T00:00:00.000Z' },
      attempts: [], dueReviews: [], completions: [],
    });
    const culturePrompts = [{ id: 'test', theme: '测试', promptZh: '文化带来益处。', referenceAnswer: 'Culture brings a benefit.', targetWordIds: ['v2'], keyPoints: ['益处'] }];
    render(<DailyVocabularySession repository={learningRepository} entries={entries} culturePrompts={culturePrompts} today="2026-09-25" examDate="2026-12-12" onComplete={() => undefined} />);
    await userEvent.click(await screen.findByRole('button', { name: '开始翻译强化词检测' }));
    expect(await screen.findByRole('heading', { name: '先检测翻译强化词' })).toBeVisible();
    expect(screen.getByText('_______')).toBeVisible();
  });

  it('continues into a daily culture translation even when there are no new words', async () => {
    const learningRepository = repository();
    vi.mocked(learningRepository.getDashboardSnapshot).mockResolvedValueOnce({
      knowledgeStates: entries.map((item) => ({ id: `knowledge:${item.id}`, itemId: item.id, status: 'mastered', favorite: false, reviewStage: 4, nextReviewAt: '2026-12-20T00:00:00.000Z', updatedAt: '2026-09-23T00:00:00.000Z' })),
      settings: { id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-20T00:00:00.000Z' },
      attempts: [], dueReviews: [], completions: [],
    });
    render(<DailyVocabularySession repository={learningRepository} entries={entries} today="2026-09-25" examDate="2026-12-12" onComplete={() => undefined} />);
    await userEvent.click(await screen.findByRole('button', { name: '开始今日文化翻译' }));
    expect(await screen.findByRole('heading', { name: /中国文化翻译/ })).toBeVisible();
  });

  it('tests due old words before showing a new word', async () => {
    const learningRepository = repository();
    render(<DailyVocabularySession repository={learningRepository} entries={entries} today="2026-09-25" examDate="2026-12-12" onComplete={() => undefined} />);
    expect(await screen.findByRole('heading', { name: '先复习旧词' })).toBeVisible();
    expect(screen.getByText('p_s_a_e')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'benefit' })).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('补全单词'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: '提交旧词复习' }));
    expect(await screen.findByRole('heading', { name: 'benefit' })).toBeVisible();
    expect(learningRepository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({ questionId: 'v1:spelling', format: 'word-cloze' }));
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
    expect(learningRepository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({ questionId: 'v1:spelling', format: 'word-cloze' }));
  });
});
