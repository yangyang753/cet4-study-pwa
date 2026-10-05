import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SubjectiveQuestion } from '../../domain/content';
import { SubjectiveEditor } from './SubjectiveEditor';
import type { LearningRepository } from '../../data/repositories/LearningRepository';

const question: SubjectiveQuestion = { id: 'write-1', version: 1, type: 'writing', difficulty: 'foundation', prompt: 'Write about study habits.', knowledgePointIds: ['kp'], explanationZh: '结构完整。', sourceNote: 'Original exercise modeled on the official CET-4 format', rubric: ['观点明确', '结构完整'], referenceAnswer: 'Daily practice is useful.' };
const validWriting = `First, daily practice helps students remember important knowledge and notice their weak points before an examination. A clear routine also makes a difficult goal feel smaller, so learners are more willing to begin instead of waiting for the perfect moment. Keeping a notebook beside the textbook also helps students capture useful expressions and review them before they disappear from memory.

Therefore, I plan to study at the same time each evening, review mistakes, and write down one question for the next day. This simple method gives every session a purpose and allows steady progress without creating unnecessary pressure. It also builds confidence because improvement becomes visible after several consistent weeks. Finally, I will compare my work every Sunday and adjust the routine when one activity is no longer useful.`;

afterEach(() => { localStorage.clear(); vi.useRealTimers(); });

describe('SubjectiveEditor', () => {
  it('autosaves and restores a draft after two seconds idle', async () => {
    vi.useFakeTimers();
    const first = render(<SubjectiveEditor question={question} kind="writing" />);
    fireEvent.change(screen.getByLabelText('写作答题区'), { target: { value: 'Practice every day.' } });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    first.unmount();
    render(<SubjectiveEditor question={question} kind="writing" />);
    expect(screen.getByLabelText('写作答题区')).toHaveValue('Practice every day.');
  });

  it('shows a rubric and reference answer without an official score', async () => {
    const user = userEvent.setup();
    render(<SubjectiveEditor question={question} kind="writing" />);
    fireEvent.change(screen.getByLabelText('写作答题区'), { target: { value: validWriting } });
    await user.click(screen.getByRole('button', { name: '提交自查' }));
    expect(screen.getByText('Daily practice is useful.')).toBeInTheDocument();
    expect(screen.queryByText(/官方分数/)).not.toBeInTheDocument();
  });

  it('queues the autosaved draft for cross-device sync', async () => {
    vi.useFakeTimers();
    const repository = { saveDraft: vi.fn().mockResolvedValue(undefined) } as unknown as LearningRepository;
    render(<SubjectiveEditor question={question} kind="writing" repository={repository} />);
    fireEvent.change(screen.getByLabelText('写作答题区'), { target: { value: 'A synced draft.' } });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(repository.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ questionId: 'write-1', body: 'A synced draft.' }));
  });

  it('hydrates an imported or synced repository draft when this browser has no local copy', async () => {
    const repository = {
      getDrafts: vi.fn().mockResolvedValue([
        { id: 'older', questionId: 'write-1', body: 'Older synced draft.', deviceId: 'phone', updatedAt: '2026-10-01T08:00:00.000Z' },
        { id: 'newer', questionId: 'write-1', body: 'Newest synced draft.', deviceId: 'phone', updatedAt: '2026-10-02T08:00:00.000Z' },
      ]),
      saveDraft: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;

    render(<SubjectiveEditor question={question} kind="writing" repository={repository} />);

    expect(await screen.findByDisplayValue('Newest synced draft.')).toBeVisible();
  });

  it('keeps the current browser draft instead of overwriting it with an older synced copy', async () => {
    localStorage.setItem('draft:write-1', 'Current browser draft.');
    const repository = {
      getDrafts: vi.fn().mockResolvedValue([{ id: 'remote', questionId: 'write-1', body: 'Remote draft.', deviceId: 'phone', updatedAt: '2026-10-02T08:00:00.000Z' }]),
      saveDraft: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;

    render(<SubjectiveEditor question={question} kind="writing" repository={repository} />);

    expect(screen.getByLabelText('写作答题区')).toHaveValue('Current browser draft.');
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByLabelText('写作答题区')).toHaveValue('Current browser draft.');
  });

  it('does not save an empty draft before repository hydration finishes', async () => {
    vi.useFakeTimers();
    let resolveDrafts!: (value: Array<{ id: string; questionId: string; body: string; deviceId: string; updatedAt: string }>) => void;
    const repository = {
      getDrafts: vi.fn(() => new Promise((resolve) => { resolveDrafts = resolve; })),
      saveDraft: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<SubjectiveEditor question={question} kind="writing" repository={repository} />);

    await act(() => vi.advanceTimersByTimeAsync(2500));
    expect(repository.saveDraft).not.toHaveBeenCalled();
    await act(async () => resolveDrafts([{ id: 'remote', questionId: 'write-1', body: 'Recovered after import.', deviceId: 'phone', updatedAt: '2026-10-02T08:00:00.000Z' }]));
    expect(screen.getByLabelText('写作答题区')).toHaveValue('Recovered after import.');
  });

  it('counts the English words produced for a translation answer', async () => {
    const user = userEvent.setup();
    render(<SubjectiveEditor question={{ ...question, type: 'translation' }} kind="translation" />);
    await user.type(screen.getByLabelText('翻译答题区'), 'Chinese culture matters.');
    expect(screen.getByText('3 词')).toBeVisible();
  });

  it('returns the displayed local feedback with the submitted body', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SubjectiveEditor question={question} kind="writing" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('写作答题区'), { target: { value: validWriting } });
    await user.click(screen.getByRole('button', { name: '提交自查' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.stringContaining('First, daily practice helps'), expect.objectContaining({ score: 1, passed: true }));
  });

  it('keeps an invalid draft and does not complete the exercise', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SubjectiveEditor question={question} kind="writing" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('写作答题区'), { target: { value: 'Too short.' } });
    await user.click(screen.getByRole('button', { name: '提交自查' }));
    expect(screen.getByRole('alert')).toHaveTextContent('至少需要 120 个英文单词');
    expect(screen.getByLabelText('写作答题区')).toHaveValue('Too short.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('can submit diagnostic feedback without revealing suggestions or the reference answer', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SubjectiveEditor question={question} kind="writing" onSubmit={onSubmit} revealFeedback={false} />);
    fireEvent.change(screen.getByLabelText('写作答题区'), { target: { value: validWriting } });
    await user.click(screen.getByRole('button', { name: '提交自查' }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(screen.queryByText('Daily practice is useful.')).not.toBeInTheDocument();
    expect(screen.queryByText('针对性修改建议')).not.toBeInTheDocument();
  });
});
