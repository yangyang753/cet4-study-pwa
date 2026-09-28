import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { resolveExam } from './examBlueprint';
import { ExamQuestionView } from './ExamQuestionView';

describe('ExamQuestionView', () => {
  it('renders cloze as a shared word-bank selector instead of ordinary radios', async () => {
    const user = userEvent.setup();
    const question = resolveExam('mock-1').sections.find((section) => section.kind === 'reading')!.questions.find((item) => item.type === 'cloze')!;
    const onChange = vi.fn();
    render(<ExamQuestionView question={question} response="" onChange={onChange} />);
    expect(screen.getByRole('heading', { name: '选词填空词库' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: /空格 1/ }).querySelectorAll('option')).toHaveLength(16);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox'), question.correctAnswer as string);
    expect(onChange).toHaveBeenCalledWith(question.correctAnswer);
  });

  it('renders paragraph matching with A-J choices and shared paragraphs', () => {
    const question = resolveExam('mock-1').sections.find((section) => section.kind === 'reading')!.questions.find((item) => item.type === 'matching')!;
    render(<ExamQuestionView question={question} response="" onChange={() => undefined} />);
    expect(screen.getByRole('heading', { name: '长篇阅读段落' })).toBeVisible();
    expect(screen.getAllByRole('radio')).toHaveLength(10);
    expect(screen.getByText('[A]', { exact: false })).toBeVisible();
  });
});
