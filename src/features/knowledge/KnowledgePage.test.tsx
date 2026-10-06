import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { KnowledgePage } from './KnowledgePage';

describe('KnowledgePage', () => {
  beforeEach(() => localStorage.clear());
  it('presents the audited high-frequency inventory', () => {
    render(<KnowledgePage />);
    expect(screen.getByText('800')).toBeInTheDocument();
    expect(screen.getByText('126')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText(/原创仿真内容，不是历年官方真题/)).toBeInTheDocument();
    expect(screen.queryByText(/^文章，段落.*通过/)).not.toBeInTheDocument();
  });

  it('hides each meaning until that word is explicitly revealed', async () => {
    render(<KnowledgePage />);
    expect(screen.queryByText(/^文章，段落.*通过/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '显示 passage 的释义' }));
    expect(screen.getByText(/^文章，段落.*通过/)).toBeVisible();
    expect(screen.queryByText('一个人')).not.toBeInTheDocument();
  });

  it('offers one aggregate review without per-word hint buttons', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:v0001', itemId: 'v0001', status: 'review', favorite: false, reviewStage: 0, updatedAt: '2026-09-24T08:00:00.000Z' },
      ] }),
    } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} random={() => 0.4} />);
    expect(await screen.findByRole('button', { name: /开始待复习词总巩固/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /巩固练习 passage/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /开始待复习词总巩固/ }));
    const session = screen.getByRole('heading', { name: /待复习单词总巩固/ }).closest('section');
    const stateTabs = screen.getByRole('group', { name: '单词掌握状态' });
    expect(session).toBeVisible();
    expect(session!.compareDocumentPosition(stateTabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText(/passage · 随机巩固/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('英文答案')).toBeVisible();
  });

  it('includes learned words even when the next scheduled review has not arrived', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:v0001', itemId: 'v0001', status: 'review', favorite: false, reviewStage: 1, nextReviewAt: '2999-09-24T08:00:00.000Z', updatedAt: '2026-09-24T08:00:00.000Z' },
        { id: 'knowledge:v0002', itemId: 'v0002', status: 'review', favorite: false, reviewStage: 1, nextReviewAt: '2000-09-24T08:00:00.000Z', updatedAt: '2026-09-24T08:00:00.000Z' },
      ] }),
    } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} />);
    expect(await screen.findByRole('button', { name: '开始待复习词总巩固，共 2 个' })).toBeVisible();
  });

  it('records an incorrect aggregate reinforcement as an attempt and mistake', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:v0001', itemId: 'v0001', status: 'review', favorite: false, reviewStage: 0, updatedAt: '2026-09-24T08:00:00.000Z' },
      ] }),
      upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} random={() => 0.4} />);
    await userEvent.click(await screen.findByRole('button', { name: /开始待复习词总巩固/ }));
    await userEvent.type(screen.getByLabelText('英文答案'), 'pasage');
    await userEvent.click(screen.getByRole('button', { name: '提交巩固结果' }));
    expect(await screen.findByText(/已加入错题复习/)).toBeVisible();
    expect(repository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({ wordId: 'v0001', format: 'word-cloze' }));
    expect(repository.saveAttemptOnce).toHaveBeenCalledWith(expect.objectContaining({ kind: 'vocabulary', mode: 'review', correct: false }));
  });

  it('does not create a mistake when a meaning answer reaches the displayed threshold', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:v0018', itemId: 'v0018', status: 'review', favorite: false, reviewStage: 0, updatedAt: '2026-09-24T08:00:00.000Z' },
      ] }),
      upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} random={() => 0.1} />);

    await userEvent.click(await screen.findByRole('button', { name: /开始待复习词总巩固/ }));
    await userEvent.type(screen.getByLabelText('中文释义答案'), '给；通过；举办；让步');
    await userEvent.click(screen.getByRole('button', { name: '提交巩固结果' }));

    expect(await screen.findByText(/回答正确，已识别 3 个关键点/)).toBeVisible();
    expect(repository.upsertReviewCard).not.toHaveBeenCalled();
    expect(repository.saveAttemptOnce).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });

  it('records a passed learned-word translation without creating a mistake card', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:v0164', itemId: 'v0164', status: 'review', favorite: false, reviewStage: 1, updatedAt: '2026-09-24T08:00:00.000Z' },
      ] }),
      upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} random={() => 0} />);

    await userEvent.click(await screen.findByRole('button', { name: '开始单词短句' }));
    await userEvent.type(screen.getByRole('textbox', { name: '英文短句答案' }), 'Chinese culture attracts many young people.');
    await userEvent.click(screen.getByRole('button', { name: '提交中译英' }));

    expect(await screen.findByText(/本题通过/)).toBeVisible();
    expect(repository.upsertReviewCard).not.toHaveBeenCalled();
    expect(repository.saveAttemptOnce).toHaveBeenCalledWith(expect.objectContaining({ kind: 'vocabulary', mode: 'review', correct: true }));
  });

  it('offers learned-word translation only after strict testing has moved a word out of warm-up', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:v0001', itemId: 'v0001', status: 'learning', favorite: false, updatedAt: '2026-09-24T08:00:00.000Z' },
        { id: 'knowledge:v0164', itemId: 'v0164', status: 'review', favorite: false, reviewStage: 1, updatedAt: '2026-09-24T08:00:00.000Z' },
      ] }),
    } as unknown as LearningRepository;

    render(<KnowledgePage repository={repository} random={() => 0} />);

    await screen.findByRole('heading', { name: '已学词短句中译英' });
    expect(screen.getByText('个已学词可用').parentElement).toHaveTextContent('1 个已学词可用');
  });

  it('adds only a missed translation target as a Chinese-to-English review card', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:v0164', itemId: 'v0164', status: 'mastered', favorite: false, reviewStage: 4, updatedAt: '2026-09-24T08:00:00.000Z' },
      ] }),
      upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} random={() => 0} />);

    await userEvent.click(await screen.findByRole('button', { name: '开始单词短句' }));
    await userEvent.type(screen.getByRole('textbox', { name: '英文短句答案' }), 'I cannot answer this sentence.');
    await userEvent.click(screen.getByRole('button', { name: '提交中译英' }));

    expect(await screen.findByText(/已加入中译英错题复习/)).toBeVisible();
    expect(repository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({ wordId: 'v0164', format: 'word-translation' }));
    expect(repository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'v0164', status: 'review' }));
  });

  it('adds the target to review when a translation uses the word in an unrelated sentence', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:v0164', itemId: 'v0164', status: 'review', favorite: false, reviewStage: 1, updatedAt: '2026-09-24T08:00:00.000Z' },
      ] }),
      upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} random={() => 0} />);

    await userEvent.click(await screen.findByRole('button', { name: '开始单词短句' }));
    await userEvent.type(screen.getByRole('textbox', { name: '英文短句答案' }), 'Culture banana table.');
    await userEvent.click(screen.getByRole('button', { name: '提交中译英' }));

    expect(await screen.findByText(/已加入中译英错题复习/)).toBeVisible();
    expect(repository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({ wordId: 'v0164', format: 'word-translation' }));
    expect(repository.saveAttemptOnce).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });

  it('adds only the wrong learned word from a multi-target translation', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:v0164', itemId: 'v0164', status: 'review', favorite: false, reviewStage: 1, updatedAt: '2026-09-24T08:00:00.000Z' },
        { id: 'knowledge:v0218', itemId: 'v0218', status: 'review', favorite: false, reviewStage: 1, updatedAt: '2026-09-24T08:00:00.000Z' },
      ] }),
      upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} random={() => 0} />);

    await userEvent.click(await screen.findByRole('button', { name: '开始多词短句' }));
    await userEvent.type(screen.getByRole('textbox', { name: '英文短句答案' }), 'Chinese culture has a long story.');
    await userEvent.click(screen.getByRole('button', { name: '提交中译英' }));

    expect(await screen.findByText(/1 个目标词已加入中译英错题复习/)).toBeVisible();
    expect(repository.upsertReviewCard).toHaveBeenCalledTimes(1);
    expect(repository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({ wordId: 'v0218', format: 'word-translation' }));
    expect(repository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'v0164', status: 'review', reviewStage: 2 }));
    expect(repository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'v0218', status: 'review', reviewStage: 0 }));
  });

  it('finishes a one-word aggregate round with a visible summary instead of repeating it', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:v0001', itemId: 'v0001', status: 'review', favorite: false, reviewStage: 0, updatedAt: '2026-09-24T08:00:00.000Z' },
      ] }),
      upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} random={() => 0.4} />);

    await userEvent.click(await screen.findByRole('button', { name: /开始待复习词总巩固/ }));
    expect(screen.getByText(/第 1 \/ 1 题/)).toBeVisible();
    await userEvent.type(screen.getByLabelText('英文答案'), 'passage');
    await userEvent.click(screen.getByRole('button', { name: '提交巩固结果' }));
    await userEvent.click(await screen.findByRole('button', { name: '查看本轮报告' }));

    expect(screen.getByRole('heading', { name: '本轮巩固完成' })).toBeVisible();
    expect(screen.getByText('测试 1 个')).toBeVisible();
    expect(screen.getByText('完全正确 1 个')).toBeVisible();
    expect(screen.getByText('需要重学 0 个')).toBeVisible();
  });

  it('starts another aggregate round after a completed round', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:v0001', itemId: 'v0001', status: 'review', favorite: false, reviewStage: 0, updatedAt: '2026-09-24T08:00:00.000Z' },
      ] }),
      upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} random={() => 0.4} />);

    await userEvent.click(await screen.findByRole('button', { name: /开始待复习词总巩固/ }));
    await userEvent.type(screen.getByLabelText('英文答案'), 'passage');
    await userEvent.click(screen.getByRole('button', { name: '提交巩固结果' }));
    await userEvent.click(await screen.findByRole('button', { name: '查看本轮报告' }));
    await userEvent.click(screen.getByRole('button', { name: '开始新一轮' }));

    expect(screen.getByRole('heading', { name: '待复习单词总巩固' })).toBeVisible();
    expect(screen.getByText(/第 1 \/ 1 题/)).toBeVisible();
  });

  it('restores a completed aggregate report after remounting the page', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:v0001', itemId: 'v0001', status: 'review', favorite: false, reviewStage: 0, updatedAt: '2026-09-24T08:00:00.000Z' },
      ] }),
      upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
      upsertReviewCard: vi.fn().mockResolvedValue(undefined),
      saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    const first = render(<KnowledgePage repository={repository} random={() => 0.4} />);
    await userEvent.click(await screen.findByRole('button', { name: /开始待复习词总巩固/ }));
    await userEvent.type(screen.getByLabelText('英文答案'), 'passage');
    await userEvent.click(screen.getByRole('button', { name: '提交巩固结果' }));
    await userEvent.click(await screen.findByRole('button', { name: '查看本轮报告' }));
    first.unmount();

    render(<KnowledgePage repository={repository} random={() => 0.4} />);

    expect(screen.getByRole('heading', { name: '本轮巩固完成' })).toBeVisible();
    expect(screen.getByText('测试 1 个')).toBeVisible();
  });

  it('offers to resume an unfinished aggregate round after remounting the page', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:v0001', itemId: 'v0001', status: 'review', favorite: false, reviewStage: 0, updatedAt: '2026-09-24T08:00:00.000Z' },
      ] }),
    } as unknown as LearningRepository;
    const first = render(<KnowledgePage repository={repository} random={() => 0.4} />);
    await userEvent.click(await screen.findByRole('button', { name: /开始待复习词总巩固/ }));
    first.unmount();

    render(<KnowledgePage repository={repository} random={() => 0.4} />);
    await userEvent.click(screen.getByRole('button', { name: '继续未完成的总巩固' }));

    expect(screen.getByRole('heading', { name: '待复习单词总巩固' })).toBeVisible();
  });

  it('filters vocabulary by the learner query', async () => {
    const user = userEvent.setup();
    render(<KnowledgePage />);
    await user.type(screen.getByRole('searchbox', { name: '搜索高频词' }), 'environment');
    expect(screen.getByRole('heading', { name: 'environment' })).toBeInTheDocument();
  });

  it('never offers manual mastery controls for vocabulary', async () => {
    const repository = { getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [] }) } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} />);
    await screen.findByRole('button', { name: /待学习/ });
    expect(screen.queryByRole('button', { name: /标记为已掌握/ })).not.toBeInTheDocument();
  });

  it('separates collocations by automatic mastery state and has no manual mastery button', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:c001', itemId: 'c001', status: 'mastered', favorite: false, reviewStage: 4, updatedAt: '2026-09-24T08:00:00.000Z' },
        { id: 'knowledge:c002', itemId: 'c002', status: 'review', favorite: false, reviewStage: 1, updatedAt: '2026-09-24T08:00:00.000Z' },
      ] }),
    } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} />);
    await userEvent.click(screen.getByRole('tab', { name: '重点搭配' }));

    expect(await screen.findByRole('button', { name: /待学习（124）/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /标记为已掌握/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /已掌握（1）/ }));
    expect(screen.getByRole('heading', { name: 'take part in' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'play an important role in' })).not.toBeInTheDocument();
  });


  it('restores mastered knowledge from the saved dashboard snapshot', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({
        attempts: [],
        reviewCards: [],
        dailyProgress: [],
        knowledgeStates: [{
          id: 'knowledge:v0001',
          itemId: 'v0001',
          status: 'mastered',
          favorite: false,
          updatedAt: '2026-09-24T08:00:00.000Z',
        }],
      }),
    } as unknown as LearningRepository;

    render(<KnowledgePage repository={repository} />);

    await userEvent.click(await screen.findByRole('button', { name: /已掌握（1）/ }));
    expect(screen.getByRole('heading', { name: 'passage' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'one' })).not.toBeInTheDocument();
  });

  it('shows and filters words that need mastery', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [{
        id: 'knowledge:v0001', itemId: 'v0001', status: 'review', favorite: false, updatedAt: '2026-09-24T08:00:00.000Z',
      }] }),
    } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} />);

    await userEvent.click(await screen.findByRole('button', { name: /学习中与待复习（1）/ }));
    expect(await screen.findByText('待复习')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'passage' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'one' })).not.toBeInTheDocument();
  });

  it('keeps learning and mastered words in separate views', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:v0001', itemId: 'v0001', status: 'learning', favorite: false, updatedAt: '2026-09-24T08:00:00.000Z' },
        { id: 'knowledge:v0002', itemId: 'v0002', status: 'mastered', favorite: false, updatedAt: '2026-09-24T08:00:00.000Z' },
      ] }),
    } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} />);
    await userEvent.click(await screen.findByRole('button', { name: /学习中与待复习（1）/ }));
    expect(screen.getByRole('heading', { name: 'passage' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'one' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /已掌握（1）/ }));
    expect(screen.getByRole('heading', { name: 'one' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'passage' })).not.toBeInTheDocument();
  });
});
