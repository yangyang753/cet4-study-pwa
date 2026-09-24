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
  });

  it('filters vocabulary by the learner query', async () => {
    const user = userEvent.setup();
    render(<KnowledgePage />);
    await user.type(screen.getByRole('searchbox', { name: '搜索高频词' }), 'environment');
    expect(screen.getByRole('heading', { name: 'environment' })).toBeInTheDocument();
  });

  it('stores a mastered knowledge state', async () => {
    const user = userEvent.setup();
    const repository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [] }),
      upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
    } as unknown as LearningRepository;
    render(<KnowledgePage repository={repository} />);
    await user.click(screen.getAllByRole('button', { name: '标记为已掌握' })[0]);
    expect(repository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ status: 'mastered' }));
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

    expect(await screen.findByRole('button', { name: '已掌握' })).toBeDisabled();
  });
});
