import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../data/repositories/LearningRepository';
import { isStudyReminderDue, reminderCapability, StudyReminder } from './StudyReminder';

const settings = {
    id: 'current', examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1,
    reminderTime: '20:00', updatedAt: '2026-09-24T00:00:00.000Z',
};
const repository = {
  getDashboardSnapshot: vi.fn().mockResolvedValue({ settings, completions: [], attempts: [] }),
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

  it('never claims background push from cloud configuration or browser permission alone', () => {
    expect(reminderCapability(false, 'default')).toEqual(expect.objectContaining({ background: false, message: expect.stringMatching(/打开应用/) }));
    expect(reminderCapability(true, 'granted')).toEqual(expect.objectContaining({ background: false, message: expect.stringMatching(/没有后台推送服务/) }));
  });

  it('shows an in-app reminder even when browser notifications are unavailable', async () => {
    render(<StudyReminder repository={repository} now={() => new Date(2026, 8, 24, 20, 5)} />);
    expect(await screen.findByText(/今天的 60 分钟训练还没有开始/)).toBeVisible();
  });

  it('does not remind again after today\'s study task is complete', async () => {
    const completedRepository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ settings, attempts: [], completions: [{ date: '2026-09-24', taskId: '2026-09-24:listening' }] }),
    } as unknown as LearningRepository;
    render(<StudyReminder repository={completedRepository} now={() => new Date(2026, 8, 24, 20, 5)} />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(completedRepository.getDashboardSnapshot).toHaveBeenCalled();
    expect(screen.queryByText(/今天的 60 分钟训练还没有开始/)).not.toBeInTheDocument();
  });

  it('shows a catch-up cue when an established learner missed yesterday', async () => {
    const catchUpRepository = {
      getDashboardSnapshot: vi.fn().mockResolvedValue({ settings, attempts: [], completions: [{ date: '2026-09-22', taskId: '2026-09-22:listening' }] }),
    } as unknown as LearningRepository;
    render(<StudyReminder repository={catchUpRepository} now={() => new Date(2026, 8, 24, 10, 0)} />);
    expect(await screen.findByText(/昨天没有学习记录/)).toBeVisible();
    expect(screen.getByRole('link', { name: '开始复习' })).toHaveAttribute('href', expect.stringContaining('#/review'));
  });

  it('sends a regular reminder to the first vocabulary task', async () => {
    render(<StudyReminder repository={repository} now={() => new Date(2026, 8, 24, 20, 5)} />);
    expect(await screen.findByRole('link', { name: '开始学习' })).toHaveAttribute('href', expect.stringContaining('#/practice/vocabulary'));
  });
});
