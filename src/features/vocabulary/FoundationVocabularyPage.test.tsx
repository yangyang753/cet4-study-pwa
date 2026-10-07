import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { FoundationVocabularyPage } from './FoundationVocabularyPage';

const repository = {
  getDashboardSnapshot: vi.fn().mockResolvedValue({
    knowledgeStates: [
      { id: 'knowledge:f0001', itemId: 'f0001', status: 'mastered', favorite: false, updatedAt: '2026-10-06T08:00:00.000Z' },
      { id: 'knowledge:v0001', itemId: 'v0001', status: 'review', favorite: false, updatedAt: '2026-10-06T08:00:00.000Z' },
    ],
  }),
} as unknown as LearningRepository;

describe('FoundationVocabularyPage', () => {
  it('shows the expanded separate foundation library and never mixes core words', async () => {
    render(<FoundationVocabularyPage repository={repository} />);
    expect(screen.getByRole('heading', { name: '基础必会词' })).toBeVisible();
    expect(screen.getByText('203')).toBeVisible();
    expect(screen.getByText(/与 852 个高频词分开学习/)).toBeVisible();
    expect(await screen.findByRole('button', { name: /已掌握（1）/ })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'passage' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '开始今日基础词训练' })).toHaveAttribute('href', expect.stringContaining('practice/foundation-vocabulary'));
    expect(screen.getByRole('link', { name: '复习基础词错题' })).toHaveAttribute('href', expect.stringContaining('review/foundation'));
  });

  it('hides meanings by default and exposes no manual mastery control', async () => {
    const emptyRepository = { getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [] }) } as unknown as LearningRepository;
    render(<FoundationVocabularyPage repository={emptyRepository} />);
    expect(screen.queryByText('这，那；特指的人或物')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '显示 the 的释义' }));
    expect(screen.getByText(/这，那；特指的人或物/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /标记为已掌握/ })).not.toBeInTheDocument();
  });

  it('shows common irregular forms inside the revealed meaning card', async () => {
    const emptyRepository = { getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [] }) } as unknown as LearningRepository;
    render(<FoundationVocabularyPage repository={emptyRepository} />);
    await userEvent.click(screen.getByRole('button', { name: '显示 be 的释义' }));
    expect(screen.getByText('常用词形：am、is、are、was、were、been、being')).toBeVisible();
  });
});
