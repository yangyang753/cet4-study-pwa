import { render, screen, waitFor } from '@testing-library/react';
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
    completeTask: vi.fn().mockResolvedValue(undefined),
    getPlan: vi.fn().mockResolvedValue(null),
    savePlan: vi.fn().mockResolvedValue(undefined),
  } as unknown as LearningRepository;
}

describe('DailyVocabularySession', () => {
  it('uses an independent saved session and completion id for foundation words', async () => {
    const learningRepository = repository();
    Object.assign(learningRepository, {
      getPlan: vi.fn().mockResolvedValue({
        id: 'plan:2026-09-25', date: '2026-09-25', tasks: [],
        vocabularySession: { wordIds: ['v1'], learnedWordIds: ['v1'], strictPassedWordIds: ['v1'], phase: 'complete' },
        foundationVocabularySession: { wordIds: ['f0001'], learnedWordIds: [], phase: 'learning' },
        updatedAt: '2026-09-25T08:00:00.000Z',
      }),
    });
    const foundation = [{ ...entries[0], id: 'f0001', word: 'see', layer: 'foundation' as const }];

    render(<DailyVocabularySession layer="foundation" repository={learningRepository} entries={foundation} collocationEntries={[]} today="2026-09-25" examDate="2026-12-12" onComplete={() => undefined} />);

    expect(await screen.findByRole('heading', { name: '先学基础必会词，再开始检测' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'see' })).toBeVisible();
    expect(screen.queryByText('今日词汇与搭配训练已完成')).not.toBeInTheDocument();
  });

  it('completes only the foundation task and does not complete core vocabulary or collocations', async () => {
    const learningRepository = repository();
    vi.mocked(learningRepository.getDashboardSnapshot).mockResolvedValueOnce({
      knowledgeStates: [{ id: 'knowledge:f0001', itemId: 'f0001', status: 'mastered', favorite: false, reviewStage: 4, nextReviewAt: '2026-12-20T00:00:00.000Z', updatedAt: '2026-09-23T00:00:00.000Z' }],
      settings: { id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-20T00:00:00.000Z' },
      attempts: [], dueReviews: [], completions: [],
    });
    const foundation = [{ ...entries[0], id: 'f0001', word: 'see', layer: 'foundation' as const }];
    render(<DailyVocabularySession layer="foundation" repository={learningRepository} entries={foundation} collocationEntries={[]} today="2026-09-25" examDate="2026-12-12" onComplete={() => undefined} />);

    await userEvent.click(await screen.findByRole('button', { name: '完成今日词汇学习' }));

    expect(await screen.findByRole('heading', { name: '今日基础必会词训练已完成' })).toBeVisible();
    expect(learningRepository.completeTask).toHaveBeenCalledTimes(1);
    expect(learningRepository.completeTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: '2026-09-25:foundation-vocabulary', kind: 'vocabulary' }));
  });

  it('continues the saved combined session with its assigned重点搭配 cohort', async () => {
    const learningRepository = repository();
    Object.assign(learningRepository, {
      getPlan: vi.fn().mockResolvedValue({
        id: 'plan:2026-09-25', date: '2026-09-25', tasks: [],
        vocabularySession: { wordIds: [], learnedWordIds: [], collocationIds: ['c-test'], passedCollocationIds: [], phase: 'collocations' },
        updatedAt: '2026-09-25T08:00:00.000Z',
      }),
    });
    render(<DailyVocabularySession repository={learningRepository} entries={entries} collocationEntries={[
      { id: 'c-test', phrase: 'take part in', meaningZh: '参加', example: 'Students take part in the activity.', exampleZh: '学生参加这项活动。' },
    ]} today="2026-09-25" examDate="2026-12-12" onComplete={() => undefined} />);
    expect(await screen.findByRole('heading', { name: '单词之后学习重点搭配' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'take part in' })).toBeVisible();
  });

  it('migrates a saved legacy post-vocabulary phase to completed vocabulary', async () => {
    const learningRepository = repository();
    vi.mocked(learningRepository.getDashboardSnapshot).mockResolvedValueOnce({
      knowledgeStates: entries.map((item) => ({ id: `knowledge:${item.id}`, itemId: item.id, status: 'mastered' as const, favorite: false, reviewStage: 4, updatedAt: '2026-09-25T08:00:00.000Z' })),
      settings: { id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-20T00:00:00.000Z' }, attempts: [], dueReviews: [], completions: [],
    });
    Object.assign(learningRepository, {
      getPlan: vi.fn().mockResolvedValue({ id: 'plan:2026-09-25', date: '2026-09-25', tasks: [], vocabularySession: { wordIds: [], learnedWordIds: [], strictPassedWordIds: [], passedCultureReviewWordIds: ['v1'], phase: 'culture-review' }, updatedAt: '2026-09-25T08:00:00.000Z' }),
      savePlan: vi.fn().mockResolvedValue(undefined),
    });
    render(<DailyVocabularySession repository={learningRepository} entries={entries} collocationEntries={[]} today="2026-09-25" examDate="2026-12-12" onComplete={() => undefined} />);
    expect(await screen.findByRole('heading', { name: '今日词汇与搭配训练已完成' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: '中国文化翻译' })).not.toBeInTheDocument();
    await waitFor(() => expect(learningRepository.completeTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: '2026-09-25:vocabulary' })));
    expect(learningRepository.savePlan).toHaveBeenCalledWith(expect.objectContaining({ vocabularySession: expect.objectContaining({ phase: 'complete' }) }));
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
    render(<DailyVocabularySession repository={learningRepository} entries={entries} collocationEntries={[]} today="2026-09-25" examDate="2026-12-12" onComplete={() => undefined} />);
    expect(await screen.findByRole('heading', { name: '检测今日新词' })).toBeVisible();
    expect(screen.getByText(/2 \/ 2/)).toBeVisible();
  });
  it('completes vocabulary without embedding the separate culture translation', async () => {
    const learningRepository = repository();
    vi.mocked(learningRepository.getDashboardSnapshot).mockResolvedValueOnce({
      knowledgeStates: entries.map((item) => ({ id: `knowledge:${item.id}`, itemId: item.id, status: 'mastered', favorite: false, reviewStage: 4, nextReviewAt: '2026-12-20T00:00:00.000Z', updatedAt: '2026-09-23T00:00:00.000Z' })),
      settings: { id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-20T00:00:00.000Z' },
      attempts: [], dueReviews: [], completions: [],
    });
    render(<DailyVocabularySession repository={learningRepository} entries={entries} collocationEntries={[]} today="2026-09-25" examDate="2026-12-12" onComplete={() => undefined} />);
    await userEvent.click(await screen.findByRole('button', { name: '完成今日词汇学习' }));
    expect(await screen.findByRole('heading', { name: '今日词汇与搭配训练已完成' })).toBeVisible();
    expect(screen.queryByLabelText('我的英文翻译')).not.toBeInTheDocument();
  });

  it('tests due old words before showing a new word', async () => {
    const learningRepository = repository();
    render(<DailyVocabularySession repository={learningRepository} entries={entries} collocationEntries={[]} today="2026-09-25" examDate="2026-12-12" random={() => 0.4} onComplete={() => undefined} />);
    expect(await screen.findByRole('heading', { name: '先复习今天要用的单词' })).toBeVisible();
    expect(screen.getByRole('progressbar', { name: '旧词复习进度' })).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('已完成 0')).toBeVisible();
    expect(screen.getByText('剩余 1')).toBeVisible();
    expect(screen.getByText(/答错或想不起来，会自动加入错题复习/)).toBeVisible();
    expect(screen.getByText('文章，段落')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'benefit' })).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('英文答案'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: '提交词汇复习' }));
    expect(await screen.findByRole('heading', { name: 'benefit' })).toBeVisible();
    expect(learningRepository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({ questionId: 'v1:spelling', format: 'word-cloze' }));
  });

  it('does not add a correctly recalled old word to mistake review', async () => {
    const learningRepository = repository();
    render(<DailyVocabularySession repository={learningRepository} entries={entries} collocationEntries={[]} today="2026-09-25" examDate="2026-12-12" random={() => 0.4} onComplete={() => undefined} />);

    await userEvent.type(await screen.findByLabelText('英文答案'), 'passage');
    await userEvent.click(screen.getByRole('button', { name: '提交词汇复习' }));
    expect(await screen.findByRole('heading', { name: 'benefit' })).toBeVisible();
    expect(learningRepository.upsertReviewCard).not.toHaveBeenCalled();
  });

  it('adds a meaning review only when an old word meaning is wrong', async () => {
    const learningRepository = repository();
    render(<DailyVocabularySession repository={learningRepository} entries={entries} collocationEntries={[]} today="2026-09-25" examDate="2026-12-12" random={() => 0} onComplete={() => undefined} />);

    await userEvent.type(await screen.findByLabelText('中文释义答案'), '道路');
    await userEvent.click(screen.getByRole('button', { name: '提交词汇复习' }));
    expect(await screen.findByRole('heading', { name: 'benefit' })).toBeVisible();
    expect(learningRepository.upsertReviewCard).toHaveBeenCalledTimes(1);
    expect(learningRepository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({ questionId: 'v1:meaning', format: 'word-meaning' }));
  });

  it('does not advance an old word when saving fails', async () => {
    const learningRepository = repository();
    vi.mocked(learningRepository.upsertKnowledgeState).mockRejectedValueOnce(new Error('storage'));
    render(<DailyVocabularySession repository={learningRepository} entries={entries} collocationEntries={[]} today="2026-09-25" examDate="2026-12-12" random={() => 0.4} onComplete={() => undefined} />);
    await userEvent.type(await screen.findByLabelText('英文答案'), 'passage');
    await userEvent.click(screen.getByRole('button', { name: '提交词汇复习' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
    expect(screen.getByRole('textbox', { name: '英文答案' })).toHaveValue('passage');
  });

  it('allows a forgotten word to be sent directly to review', async () => {
    const learningRepository = repository();
    render(<DailyVocabularySession repository={learningRepository} entries={entries} collocationEntries={[]} today="2026-09-25" examDate="2026-12-12" random={() => 0.4} onComplete={() => undefined} />);
    await userEvent.click(await screen.findByRole('button', { name: '想不起来' }));
    expect(await screen.findByRole('heading', { name: 'benefit' })).toBeVisible();
    expect(learningRepository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({ questionId: 'v1:spelling', format: 'word-cloze' }));
  });
});
