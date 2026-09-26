import 'fake-indexeddb/auto';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Dexie from 'dexie';
import { LearningDatabase } from '../../data/localDb';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import { ListeningPage } from './ListeningPage';
import vocabulary from '../../../content/v1/vocabulary.json';

const databases: string[] = [];

function repository() {
  const name = `listening-test-${crypto.randomUUID()}`;
  databases.push(name);
  return new DexieLearningRepository(new LearningDatabase(name));
}

async function unlockListeningQuestion() {
  const translation = vocabulary.map((item) => item.meaningZh).join(' ');
  for (const input of screen.getAllByRole('textbox').filter((item) => item.getAttribute('aria-label')?.includes('中文翻译'))) {
    fireEvent.change(input, { target: { value: translation } });
  }
  await userEvent.click(await screen.findByRole('button', { name: '检查翻译并解锁选项' }));
  await screen.findByText('高频词义覆盖通过，可以开始作答。');
}

describe('ListeningPage', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await Promise.all(databases.splice(0).map((name) => Dexie.delete(name)));
  });

  it('resolves audio under the deployed application base path', () => {
    vi.stubEnv('BASE_URL', '/cet4-study-pwa/');
    const { container } = render(<ListeningPage />);
    expect(container.querySelector('audio')).toHaveAttribute('src', '/cet4-study-pwa/audio/v1/listen-01.wav');
    expect(screen.getByText(/合成语音训练材料/)).toBeInTheDocument();
  });

  it('moves through all 24 listening sets', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<ListeningPage />);
    expect(screen.getByText('第 1 / 24 套')).toBeInTheDocument();
    expect(screen.getByText(/校园志愿活动/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '下一套' }));
    expect(screen.getByText('第 2 / 24 套')).toBeInTheDocument();
    expect(screen.getByText(/图书馆服务/)).toBeInTheDocument();
  });

  it('reports buffering and ready states from the real media element', () => {
    const { container } = render(<ListeningPage />);
    const media = container.querySelector('audio')!;
    fireEvent.waiting(media);
    expect(screen.getByText('缓冲中…')).toBeInTheDocument();
    fireEvent.canPlay(media);
    expect(screen.getByText('可以播放')).toBeInTheDocument();
  });

  it('offers recovery when the browser rejects playback', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new DOMException('Not allowed', 'NotAllowedError'));
    const user = userEvent.setup();
    render(<ListeningPage />);
    await user.click(screen.getByRole('button', { name: '播放' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('浏览器未能开始播放');
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  });

  it('keeps the transcript hidden until the learner asks to see it', async () => {
    const user = userEvent.setup();
    render(<ListeningPage />);
    expect(screen.queryByText(/Saturday team reached its maximum size/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '显示原文' }));
    expect(screen.getByText(/Saturday team reached its maximum size/)).toBeInTheDocument();
  });

  it('preserves the selected answer and offers text mode after audio failure', async () => {
    const user = userEvent.setup();
    const { container } = render(<ListeningPage />);
    await unlockListeningQuestion();
    await user.click(screen.getByRole('radio', { name: /Sunday afternoon/ }));
    fireEvent.error(container.querySelector('audio')!);
    expect(screen.getByRole('radio', { name: /Sunday afternoon/ })).toBeChecked();
    expect(screen.getByRole('button', { name: '文本模式' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  });

  it('supports the approved playback rates', async () => {
    const user = userEvent.setup();
    render(<ListeningPage />);
    await user.selectOptions(screen.getByLabelText('播放速度'), '1.25');
    expect(screen.getByLabelText('播放速度')).toHaveValue('1.25');
  });

  it('loads the saved default playback rate', async () => {
    const learningRepository = repository();
    await learningRepository.saveUserSettings({
      id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1.25,
      updatedAt: '2026-09-24T00:00:00.000Z',
    });

    render(<ListeningPage repository={learningRepository} />);

    await waitFor(() => expect(screen.getByLabelText('播放速度')).toHaveValue('1.25'));
  });

  it('does not clear a selected answer when saved playback settings arrive late', async () => {
    let resolveSnapshot!: (value: { settings: { id: 'current'; examDate: string; dailyMinutes: number; playbackRate: number; updatedAt: string } }) => void;
    const learningRepository = {
      getDashboardSnapshot: vi.fn()
        .mockResolvedValueOnce({ knowledgeStates: [] })
        .mockReturnValue(new Promise((resolve) => { resolveSnapshot = resolve; })),
    } as unknown as DexieLearningRepository;
    const user = userEvent.setup();
    render(<ListeningPage repository={learningRepository} />);

    await unlockListeningQuestion();
    await user.click(screen.getByRole('radio', { name: /Sunday afternoon/ }));
    resolveSnapshot({ settings: {
      id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1.25,
      updatedAt: '2026-09-24T00:00:00.000Z',
    } });

    await waitFor(() => expect(screen.getByLabelText('播放速度')).toHaveValue('1.25'));
    expect(screen.getByRole('radio', { name: /Sunday afternoon/ })).toBeChecked();
  });

  it('requires an answer before submission', async () => {
    const user = userEvent.setup();
    render(<ListeningPage repository={repository()} />);

    await unlockListeningQuestion();
    await user.click(screen.getByRole('button', { name: '提交答案' }));

    expect(screen.getByText('请选择一个答案')).toBeVisible();
  });

  it('grades a correct answer and saves one attempt on a double click', async () => {
    const user = userEvent.setup();
    const learningRepository = repository();
    render(<ListeningPage repository={learningRepository} />);

    await unlockListeningQuestion();
    await user.click(screen.getByRole('radio', { name: /Sunday afternoon/ }));
    await user.dblClick(screen.getByRole('button', { name: '提交答案' }));

    expect(await screen.findByText('回答正确')).toBeVisible();
    await waitFor(async () => expect(await learningRepository.listAttempts()).toHaveLength(1));
  });

  it('reuses the same attempt id when a failed save is retried', async () => {
    const user = userEvent.setup();
    const learningRepository = repository();
    const originalSave = learningRepository.saveAttemptOnce.bind(learningRepository);
    const save = vi.spyOn(learningRepository, 'saveAttemptOnce').mockRejectedValueOnce(new Error('storage')).mockImplementation(originalSave);
    render(<ListeningPage repository={learningRepository} />);

    await unlockListeningQuestion();
    await user.click(screen.getByRole('radio', { name: /Sunday afternoon/ }));
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    expect(await screen.findByText(/保存失败/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: '提交答案' }));
    expect(await screen.findByText('回答正确')).toBeVisible();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[0][0].id).toBe(save.mock.calls[1][0].id);
  });

  it('adds a wrong answer to the review queue', async () => {
    const user = userEvent.setup();
    const learningRepository = repository();
    render(<ListeningPage repository={learningRepository} />);

    await unlockListeningQuestion();
    await user.click(screen.getByRole('radio', { name: /announced next month/ }));
    await user.click(screen.getByRole('button', { name: '提交答案' }));

    expect(await screen.findByText('回答错误')).toBeVisible();
    await waitFor(async () => expect(await learningRepository.listDueReviews('9999-12-31T23:59:59.999Z')).toHaveLength(1));
  });

  it('automatically completes listening after the whole set and offers mastery questions', async () => {
    const user = userEvent.setup();
    const learningRepository = repository();
    render(<ListeningPage repository={learningRepository} today="2026-09-22" />);
    const correctAnswers = [
      /new group will meet on Sunday afternoon/, /Saturday team reached its maximum size/, /student volunteer office is organizing reading visits/,
      /Applications close before Thursday noon/, /student card and one picture book/, /No teaching experience is needed/, /watch the recorded briefing/,
    ];
    for (let index = 0; index < correctAnswers.length; index += 1) {
      await unlockListeningQuestion();
      await user.click(screen.getByRole('radio', { name: correctAnswers[index] }));
      await user.click(screen.getByRole('button', { name: '提交答案' }));
      expect(await screen.findByText('回答正确')).toBeVisible();
      if (index < correctAnswers.length - 1) await user.click(screen.getByRole('button', { name: '下一题' }));
    }
    expect(await screen.findByText('掌握度检测')).toBeVisible();
    await waitFor(async () => expect((await learningRepository.getDashboardSnapshot()).completions).toEqual([
      expect.objectContaining({ taskId: '2026-09-22:listening' }),
    ]));
  });
});
  it('locks listening choices until the question and options are translated', async () => {
    render(<ListeningPage repository={repository()} />);
    const choice = screen.getByRole('radio', { name: /Sunday afternoon/ });
    expect(choice).toBeDisabled();
    await unlockListeningQuestion();
    expect(screen.getByRole('radio', { name: /Sunday afternoon/ })).toBeEnabled();
  });
