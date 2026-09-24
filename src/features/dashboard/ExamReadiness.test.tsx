import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { UserSettings } from '../../domain/learning';
import { ExamReadiness } from './ExamReadiness';

const settings: UserSettings = {
  id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1,
  updatedAt: '2026-09-24T00:00:00.000Z',
};

describe('ExamReadiness', () => {
  it('shows the final-14-day preparation reminder', () => {
    render(<ExamReadiness settings={settings} today="2026-12-02" repository={{} as LearningRepository} />);
    expect(screen.getByText(/进入考前 14 天/)).toBeVisible();
  });

  it('shows the urgent final-3-day equipment reminder', () => {
    render(<ExamReadiness settings={settings} today="2026-12-10" repository={{} as LearningRepository} />);
    expect(screen.getByText(/进入考前 3 天/)).toBeVisible();
    expect(screen.getByText(/2B 铅笔/)).toBeVisible();
  });

  it('persists checklist changes with the rest of the settings', async () => {
    const user = userEvent.setup();
    const repository = { saveUserSettings: vi.fn().mockResolvedValue(undefined) } as unknown as LearningRepository;
    render(<ExamReadiness settings={settings} today="2026-12-02" repository={repository} />);

    await user.click(screen.getByRole('checkbox', { name: '报名信息已确认' }));

    expect(repository.saveUserSettings).toHaveBeenCalledWith(expect.objectContaining({
      readiness: expect.objectContaining({ registrationConfirmed: true }),
    }));
  });
});
