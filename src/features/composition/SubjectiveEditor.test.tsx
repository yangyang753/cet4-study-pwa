import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SubjectiveQuestion } from '../../domain/content';
import { SubjectiveEditor } from './SubjectiveEditor';
import type { LearningRepository } from '../../data/repositories/LearningRepository';

const question: SubjectiveQuestion = { id: 'write-1', version: 1, type: 'writing', difficulty: 'foundation', prompt: 'Write about study habits.', knowledgePointIds: ['kp'], explanationZh: '结构完整。', sourceNote: 'Original exercise modeled on the official CET-4 format', rubric: ['观点明确', '结构完整'], referenceAnswer: 'Daily practice is useful.' };
const validWriting = `First, daily practice helps students remember important knowledge and notice their weak points before an examination. A clear routine also makes a difficult goal feel smaller, so learners are more willing to begin instead of waiting for the perfect moment.

Therefore, I plan to study at the same time each evening, review mistakes, and write down one question for the next day. This simple method gives every session a purpose and allows steady progress without creating unnecessary pressure. It also builds confidence because improvement becomes visible after several consistent weeks.`;

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
    expect(screen.getByRole('alert')).toHaveTextContent('至少需要 80 个英文单词');
    expect(screen.getByLabelText('写作答题区')).toHaveValue('Too short.');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
