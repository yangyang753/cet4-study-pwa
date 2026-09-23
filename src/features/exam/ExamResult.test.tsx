import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { resolveExam } from './examBlueprint';
import { createExamSession, reduceExamSession } from './examSessionReducer';
import { ExamResult } from './ExamResult';

describe('ExamResult', () => {
  it('shows section analysis and subjective self-check without a fabricated official score', () => {
    const exam = resolveExam('mock-1');
    const session = reduceExamSession(createExamSession(exam, '2026-09-23T00:00:00.000Z'), { type: 'submit', now: '2026-09-23T01:00:00.000Z' });
    const repository = { upsertReviewCard: vi.fn().mockResolvedValue(undefined) } as unknown as LearningRepository;

    render(<ExamResult session={session} exam={exam} repository={repository} />);

    expect(screen.getByText('主观题自查')).toBeVisible();
    expect(screen.getByText('分项完成情况')).toBeVisible();
    expect(screen.queryByText(/710/)).not.toBeInTheDocument();
  });
});
