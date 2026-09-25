import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { KnowledgePage } from './KnowledgePage';

describe('KnowledgePage', () => {
  it('presents the audited high-frequency inventory', () => {
    render(<KnowledgePage />);
    expect(screen.getByText('800')).toBeInTheDocument();
    expect(screen.getByText('126')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText(/原创仿真内容，不是历年官方真题/)).toBeInTheDocument();
    expect(screen.getByText('Read the passage carefully before answering the questions.')).toBeVisible();
  });

  it('filters vocabulary by the learner query', async () => {
    const user = userEvent.setup();
    render(<KnowledgePage />);
    await user.type(screen.getByRole('searchbox', { name: '搜索高频词' }), 'environment');
    expect(screen.getByRole('heading', { name: 'environment' })).toBeInTheDocument();
  });

  it('never offers manual mastery controls for vocabulary', async () => {
    const repository = { getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [] }) } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} />);
    await screen.findByRole('button', { name: /待学习/ });
    expect(screen.queryByRole('button', { name: /标记为已掌握/ })).not.toBeInTheDocument();
  });

  it('restores mastered knowledge from the saved dashboard snapshot', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({
        attempts: [],
        reviewCards: [],
        dailyProgress: [],
        knowledgeStates: [{
          id: 'knowledge:v0001',
          itemId: 'v0001',
          status: 'mastered',
          favorite: false,
          updatedAt: '2026-09-24T08:00:00.000Z',
        }],
      }),
    } as unknown as LearningRepository;

    render(<KnowledgePage repository={repository} />);

    await userEvent.click(await screen.findByRole('button', { name: /已掌握（1）/ }));
    expect(screen.getByRole('heading', { name: 'passage' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'one' })).not.toBeInTheDocument();
  });

  it('shows and filters words that need mastery', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [{
        id: 'knowledge:v0001', itemId: 'v0001', status: 'review', favorite: false, updatedAt: '2026-09-24T08:00:00.000Z',
      }] }),
    } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} />);

    await userEvent.click(await screen.findByRole('button', { name: /学习中与待复习（1）/ }));
    expect(await screen.findByText('待复习')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'passage' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'one' })).not.toBeInTheDocument();
  });

  it('keeps learning and mastered words in separate views', async () => {
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
        { id: 'knowledge:v0001', itemId: 'v0001', status: 'learning', favorite: false, updatedAt: '2026-09-24T08:00:00.000Z' },
        { id: 'knowledge:v0002', itemId: 'v0002', status: 'mastered', favorite: false, updatedAt: '2026-09-24T08:00:00.000Z' },
      ] }),
    } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} />);
    await userEvent.click(await screen.findByRole('button', { name: /学习中与待复习（1）/ }));
    expect(screen.getByRole('heading', { name: 'passage' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'one' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /已掌握（1）/ }));
    expect(screen.getByRole('heading', { name: 'one' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'passage' })).not.toBeInTheDocument();
  });
});
