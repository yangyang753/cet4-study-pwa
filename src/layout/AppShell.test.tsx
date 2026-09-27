import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../data/repositories/LearningRepository';
import { AppShell } from './AppShell';

const repository = {
  getDashboardSnapshot: vi.fn().mockResolvedValue({
    attempts: [], dueReviews: [], knowledgeStates: [], completions: [],
    settings: { id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-27T00:00:00.000Z' },
  }),
} as unknown as LearningRepository;

describe('AppShell', () => {
  it('groups desktop navigation and exposes four primary mobile destinations', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/today']}>
        <AppShell repository={repository} today="2026-09-27"><p>学习内容</p></AppShell>
      </MemoryRouter>,
    );

    expect(screen.getByText('每日训练')).toBeInTheDocument();
    expect(screen.getByText('巩固提升')).toBeInTheDocument();
    expect(screen.getByText('工具与数据')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '移动端主导航' }).querySelectorAll('a')).toHaveLength(4);
    expect(screen.getAllByRole('link', { name: '今日学习' })[0]).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByRole('progressbar', { name: '今日学习进度' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '备份学习数据' })).toHaveAttribute('href', '/account');

    await user.click(screen.getByRole('button', { name: '更多' }));
    const dialog = screen.getByRole('dialog', { name: '更多学习功能' });
    expect(dialog).toBeInTheDocument();
    for (const label of ['限时模拟', '高频知识', '账户同步', 'A4 打印']) expect(within(dialog).getByRole('link', { name: label })).toBeInTheDocument();
    expect(screen.getByText('学习内容')).toBeInTheDocument();
  });

  it('renders the active child route inside the shell', () => {
    render(
      <MemoryRouter initialEntries={['/today']}>
        <Routes>
          <Route element={<AppShell repository={repository} today="2026-09-27" />}>
            <Route path="today" element={<h1>今日任务</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '今日任务' })).toBeInTheDocument();
  });
});
