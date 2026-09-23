import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TodayPage } from './TodayPage';
import type { LearningRepository } from '../../data/repositories/LearningRepository';

const snapshot = {
  attempts: [], dueReviews: [], completions: [], knowledgeStates: [],
  settings: { id: 'current' as const, examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-22T00:00:00.000Z' },
};

function repository(overrides = {}) {
  return { getDashboardSnapshot: async () => ({ ...snapshot, ...overrides }) } as unknown as LearningRepository;
}

describe('TodayPage', () => {
  it('shows the countdown and the four-part 60-minute plan', () => {
    render(<TodayPage today="2026-09-22" examDate="2026-12-12" />);
    expect(screen.getByText('81')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /今日 60 分钟计划/ })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getByText('正在积累数据')).toBeVisible();
  });

  it('does not offer manual completion controls', async () => {
    render(<TodayPage today="2026-09-22" repository={repository()} />);
    expect(await screen.findAllByText('未完成')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: '标记完成' })).not.toBeInTheDocument();
  });

  it('shows automatic practice and mastery states', async () => {
    render(<TodayPage today="2026-09-22" repository={repository({
      completions: [
        { id: '2026-09-22:vocabulary', date: '2026-09-22', taskId: '2026-09-22:vocabulary', kind: 'vocabulary', completedAt: '2026-09-22T08:00:00.000Z' },
        { id: '2026-09-22:listening', date: '2026-09-22', taskId: '2026-09-22:listening', kind: 'listening', completedAt: '2026-09-22T08:10:00.000Z' },
      ],
      knowledgeStates: [
        { id: 'mastery:2026-09-22:listening', itemId: '2026-09-22:listening', status: 'mastered', favorite: false, updatedAt: '2026-09-22T08:15:00.000Z' },
      ],
    })} />);
    expect(await screen.findByRole('link', { name: '开始掌握检测' })).toHaveAttribute('href', expect.stringContaining('mastery/vocabulary'));
    expect(screen.getByText('已掌握')).toBeVisible();
  });
});
