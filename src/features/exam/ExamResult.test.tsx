import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { resolveExam } from './examBlueprint';
import { createExamSession, reduceExamSession } from './examSessionReducer';
import { ExamResult } from './ExamResult';

describe('ExamResult', () => {
  it('shows a clearly labeled preparation estimate and subjective self-check', () => {
    const exam = resolveExam('mock-1');
    const session = reduceExamSession(createExamSession(exam, '2026-09-23T00:00:00.000Z'), { type: 'submit', now: '2026-09-23T01:00:00.000Z' });
    const repository = { upsertReviewCard: vi.fn().mockResolvedValue(undefined) } as unknown as LearningRepository;

    render(<ExamResult session={session} exam={exam} repository={repository} />);

    expect(screen.getByText('主观题自查')).toBeVisible();
    expect(screen.getByText('分项完成情况')).toBeVisible();
    expect(screen.getByText('0 / 710')).toBeVisible();
    expect(screen.getByText('距离 425 估计还差 425 分')).toBeVisible();
    expect(screen.getByText('备考估分基于本应用规则，不是官方 CET-4 标准分。')).toBeVisible();
  });
});
