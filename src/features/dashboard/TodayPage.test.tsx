import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TodayPage } from './TodayPage';
import type { LearningRepository } from '../../data/repositories/LearningRepository';

const snapshot = {
  attempts: [], dueReviews: [], completions: [], knowledgeStates: [],
  settings: { id: 'current' as const, examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-22T00:00:00.000Z' },
};

function repository(overrides = {}) {
  return {
    getDashboardSnapshot: async () => ({ ...snapshot, ...overrides }),
    getPlan: async (date: string) => date === '2026-10-19' ? {
      id: 'plan:2026-10-19', date, updatedAt: '2026-10-19T00:00:00.000Z',
      tasks: [
        { id: '2026-10-19:vocabulary', kind: 'vocabulary', minutes: 15, priority: 3 },
        { id: '2026-10-19:listening', kind: 'listening', minutes: 20, priority: 4 },
        { id: '2026-10-19:writing', kind: 'writing', minutes: 20, priority: 2 },
        { id: '2026-10-19:review', kind: 'review', minutes: 5, priority: 5 },
      ],
    } : null,
    savePlan: async () => undefined,
  } as unknown as LearningRepository;
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

  it('labels an unfinished specialist task carried over from yesterday', async () => {
    const attempts = Array.from({ length: 5 }, (_, index) => ({
      id: `attempt-${index}`, userId: 'local', questionId: `q-${index}`, response: 'A',
      correct: false, score: 0, durationSeconds: 10, kind: 'writing', mode: 'practice' as const,
      createdAt: `2026-10-19T0${index}:00:00.000Z`,
    }));
    render(<TodayPage today="2026-10-20" repository={repository({
      attempts,
      completions: [
        { id: '2026-10-19:vocabulary', date: '2026-10-19', taskId: '2026-10-19:vocabulary', kind: 'vocabulary', completedAt: '2026-10-19T08:00:00.000Z' },
        { id: '2026-10-19:listening', date: '2026-10-19', taskId: '2026-10-19:listening', kind: 'listening', completedAt: '2026-10-19T08:20:00.000Z' },
        { id: '2026-10-19:review', date: '2026-10-19', taskId: '2026-10-19:review', kind: 'review', completedAt: '2026-10-19T08:40:00.000Z' },
      ],
    })} />);

    await screen.findByText('优先加强短文写作');
    await waitFor(() => expect(screen.getByText('昨日顺延')).toBeVisible());
  });

  it('uses the diagnostic weakness before enough recent attempts exist', async () => {
    render(<TodayPage today="2026-09-24" repository={repository({
      settings: { ...snapshot.settings, diagnosticCompletedAt: '2026-09-23T09:00:00.000Z', diagnosticLevels: { vocabulary: 0.67, grammar: 0.33, listening: 0.67, reading: 1 } },
    })} />);

    expect(await screen.findByText('优先加强重点语法')).toBeVisible();
    expect(screen.getByRole('heading', { name: '重点语法' })).toBeVisible();
  });
});
