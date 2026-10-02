import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DailyCollocationTask } from './DailyCollocationTask';

describe('DailyCollocationTask', () => {
  it('restores the completed state after a refresh', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({
        attempts: [], dueReviews: [], knowledgeStates: [],
        completions: [{ id: '2026-09-27:collocation', date: '2026-09-27', taskId: '2026-09-27:collocation', kind: 'collocation', completedAt: '2026-09-27T08:00:00.000Z' }],
        settings: { id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-27T08:00:00.000Z' },
      }),
    } as unknown as LearningRepository;

    render(<DailyCollocationTask repository={repository} today="2026-09-27" />);
    expect(await screen.findByRole('heading', { name: '今日重点搭配已完成' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '显示搭配释义' })).not.toBeInTheDocument();
  });
});
