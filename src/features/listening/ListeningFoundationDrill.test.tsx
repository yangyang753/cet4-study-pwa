import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { ListeningFoundationDrill } from './ListeningFoundationDrill';

describe('ListeningFoundationDrill', () => {
  it('automatically adds a missed high-frequency word to review', async () => {
    const user = userEvent.setup();
    const repository = { upsertReviewCard: vi.fn().mockResolvedValue(undefined) } as unknown as LearningRepository;
    render(<ListeningFoundationDrill segments={[{ text: 'Students should register early for the activity.' }]} repository={repository} onPlaySegment={vi.fn()} />);
    await user.type(screen.getByLabelText('填入听到的单词'), 'wrong');
    await user.click(screen.getByRole('button', { name: '检查听辨' }));
    expect(await screen.findByText(/漏听或拼写错误/)).toBeVisible();
    expect(repository.upsertReviewCard).toHaveBeenCalledWith(expect.objectContaining({ wordId: expect.any(String), format: 'word-cloze', lastCorrect: false }));
  });
});
