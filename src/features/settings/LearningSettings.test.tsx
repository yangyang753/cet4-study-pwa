import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { LearningSettings } from './LearningSettings';

const savedSettings = {
  id: 'current' as const,
  examDate: '2026-12-12',
  dailyMinutes: 60,
  playbackRate: 1,
  updatedAt: '2026-09-24T00:00:00.000Z',
};

function repository() {
  return {
    getDashboardSnapshot: vi.fn().mockResolvedValue({ settings: savedSettings }),
    saveUserSettings: vi.fn().mockResolvedValue(undefined),
  } as unknown as LearningRepository;
}

describe('LearningSettings', () => {
  it('saves the exam date, daily study time, and default listening speed', async () => {
    const user = userEvent.setup();
    const learningRepository = repository();
    render(<LearningSettings repository={learningRepository} />);

    await user.clear(await screen.findByLabelText('考试日期'));
    await user.type(screen.getByLabelText('考试日期'), '2026-12-19');
    await user.clear(screen.getByLabelText('每日学习分钟数'));
    await user.type(screen.getByLabelText('每日学习分钟数'), '75');
    await user.selectOptions(screen.getByLabelText('默认听力速度'), '1.25');
    await user.click(screen.getByRole('button', { name: '保存学习设置' }));

    expect(learningRepository.saveUserSettings).toHaveBeenCalledWith(expect.objectContaining({
      examDate: '2026-12-19', dailyMinutes: 75, playbackRate: 1.25,
    }));
    expect(await screen.findByText('设置已保存')).toBeVisible();
  });

  it('rejects a daily study time outside the supported range', async () => {
    const user = userEvent.setup();
    const learningRepository = repository();
    render(<LearningSettings repository={learningRepository} />);

    await user.clear(await screen.findByLabelText('每日学习分钟数'));
    await user.type(screen.getByLabelText('每日学习分钟数'), '10');
    await user.click(screen.getByRole('button', { name: '保存学习设置' }));

    expect(screen.getByRole('alert')).toHaveTextContent('20 到 180 分钟');
    expect(learningRepository.saveUserSettings).not.toHaveBeenCalled();
  });
});
