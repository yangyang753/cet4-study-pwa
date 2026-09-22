import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SubjectiveQuestion } from '../../domain/content';
import { SubjectiveEditor } from './SubjectiveEditor';

const question: SubjectiveQuestion = { id: 'write-1', version: 1, type: 'writing', difficulty: 'foundation', prompt: 'Write about study habits.', knowledgePointIds: ['kp'], explanationZh: '结构完整。', sourceNote: 'Original exercise modeled on the official CET-4 format', rubric: ['观点明确', '结构完整'], referenceAnswer: 'Daily practice is useful.' };

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
    await user.click(screen.getByRole('button', { name: '提交自查' }));
    expect(screen.getByText('Daily practice is useful.')).toBeInTheDocument();
    expect(screen.queryByText(/官方分数/)).not.toBeInTheDocument();
  });
});
