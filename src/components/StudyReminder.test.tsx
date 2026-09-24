import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../data/repositories/LearningRepository';
import { isStudyReminderDue, StudyReminder } from './StudyReminder';

const repository = {
  getDashboardSnapshot: vi.fn().mockResolvedValue({ settings: {
    id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1,
    reminderTime: '20:00', updatedAt: '2026-09-24T00:00:00.000Z',
  } }),
} as unknown as LearningRepository;

describe('StudyReminder', () => {
  beforeEach(() => localStorage.clear());

  it('becomes due once per local day at or after the selected time', () => {
    const now = new Date(2026, 8, 24, 20, 5);
    expect(isStudyReminderDue(now, '20:00', '')).toBe(true);
    expect(isStudyReminderDue(now, '20:00', '2026-09-24')).toBe(false);
    expect(isStudyReminderDue(new Date(2026, 8, 24, 19, 59), '20:00', '')).toBe(false);
    expect(isStudyReminderDue(now, '', '')).toBe(false);
  });

  it('shows an in-app reminder even when browser notifications are unavailable', async () => {
    render(<StudyReminder repository={repository} now={() => new Date(2026, 8, 24, 20, 5)} />);
    expect(await screen.findByText(/今天的 60 分钟训练还没有开始/)).toBeVisible();
  });
});
