import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { greetingForHour, TodayPage } from './TodayPage';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { learningVocabulary } from '../../content/vocabularyLearning';

const snapshot = {
  attempts: [], dueReviews: [], completions: [], knowledgeStates: [],
  settings: { id: 'current' as const, examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1, updatedAt: '2026-09-22T00:00:00.000Z' },
};

const diagnosticProfile = {
  version: 2 as const,
  sessionId: 'diagnostic-1',
  completedAt: '2026-09-23T09:00:00.000Z',
  questionCount: 20,
  levels: { vocabulary: 0.7, grammar: 0.65, listening: 0.35, reading: 0.6, writing: 0.2, translation: 0.55 },
  sectionScores: { writing: 35, listening: 90, reading: 149, translation: 45 },
  estimatedScore: 319,
  scoreRange: { low: 264, high: 374 },
  weakSkills: ['writing', 'listening'] as const,
  confidence: 'initial' as const,
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
    saveUserSettings: async () => undefined,
  } as unknown as LearningRepository;
}

describe('TodayPage', () => {
  it('uses the local hour for the greeting', () => {
    expect(greetingForHour(7)).toBe('早上好');
    expect(greetingForHour(13)).toBe('下午好');
    expect(greetingForHour(21)).toBe('晚上好');
  });
  it('starts daily training with vocabulary before questions', async () => {
    render(<TodayPage today="2026-09-22" repository={repository()} />);
    expect(await screen.findByRole('link', { name: '开始基础必会词' })).toHaveAttribute('href', expect.stringContaining('practice/foundation-vocabulary'));
    expect(await screen.findByRole('link', { name: '学习高频词与搭配 →' })).toHaveAttribute('href', expect.stringContaining('practice/vocabulary'));
    expect(screen.getByText(/基础必会词与 800 个高频词分层学习/)).toBeVisible();
    expect(screen.getByRole('heading', { name: '中国文化中译英' }).closest('article')).toHaveTextContent('完成高频词后解锁');
  });

  it('keeps foundation and core vocabulary progress visibly separate', async () => {
    render(<TodayPage today="2026-09-22" repository={repository({
      knowledgeStates: [
        { id: 'knowledge:f0001', itemId: 'f0001', status: 'mastered', favorite: false, updatedAt: '2026-09-22T08:00:00.000Z' },
        { id: 'knowledge:v0001', itemId: 'v0001', status: 'review', favorite: false, updatedAt: '2026-09-22T08:00:00.000Z' },
      ],
    })} />);
    const foundation = await screen.findByRole('heading', { name: '基础必会词' });
    expect(foundation.closest('article')).toHaveTextContent(/179 个未首轮学习/);
    const core = screen.getByRole('heading', { name: '高频词汇与重点搭配' });
    expect(core.closest('article')).toHaveTextContent(/799 个未首轮学习/);
  });

  it('preserves the saved foundation cohort when refreshing the daily plan', async () => {
    const learningRepository = repository();
    const savePlan = vi.fn().mockResolvedValue(undefined);
    Object.assign(learningRepository, {
      getPlan: vi.fn().mockImplementation(async (date: string) => date === '2026-09-22' ? {
        id: 'plan:2026-09-22', date, tasks: [],
        foundationVocabularySession: { wordIds: ['f0001'], learnedWordIds: ['f0001'], phase: 'testing' },
        updatedAt: '2026-09-22T08:00:00.000Z',
      } : null),
      savePlan,
    });
    render(<TodayPage today="2026-09-22" repository={learningRepository} />);
    await waitFor(() => expect(savePlan).toHaveBeenCalled());
    expect(savePlan).toHaveBeenLastCalledWith(expect.objectContaining({
      foundationVocabularySession: expect.objectContaining({ wordIds: ['f0001'], phase: 'testing' }),
    }));
  });

  it('presents the day as a structured premium learning cockpit', async () => {
    render(<TodayPage today="2026-09-22" repository={repository()} />);
    expect(await screen.findByRole('region', { name: '今日备考概览' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '今日学习路线' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '备考状态' })).toBeVisible();
    expect(screen.getByText('学习证据自动记录')).toBeVisible();
    expect(screen.getByText('原创仿真训练')).toBeVisible();
  });

  it('keeps backup and exam-preparation utilities out of the daily learning page', async () => {
    localStorage.removeItem('cet4:last-backup-at');
    render(<TodayPage today="2026-09-22" repository={repository()} />);
    expect(await screen.findByRole('heading', { name: '今日学习路线' })).toBeVisible();
    expect(screen.queryByRole('alert', { name: '本机备份提醒' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '考试准备' })).not.toBeInTheDocument();
  });

  it('normalizes legacy daily time below the supported minimum', async () => {
    render(<TodayPage today="2026-09-22" repository={repository({ settings: { ...snapshot.settings, dailyMinutes: 10 } })} />);
    expect(await screen.findByText('今天只需要专注 20 分钟。')).toBeVisible();
    expect(screen.queryByText(/今天是每周整套模考日/)).not.toBeInTheDocument();
    expect(screen.getByText('20 分钟 · 按顺序完成效果更稳')).toBeVisible();
  });

  it('preserves the saved vocabulary cohort when refreshing the daily plan', async () => {
    const learningRepository = repository();
    const savePlan = vi.fn().mockResolvedValue(undefined);
    Object.assign(learningRepository, {
      getPlan: vi.fn().mockImplementation(async (date: string) => date === '2026-09-22' ? { id: 'plan:2026-09-22', date, tasks: [], vocabularySession: { wordIds: ['v0001'], learnedWordIds: ['v0001'], phase: 'testing' }, updatedAt: '2026-09-22T08:00:00.000Z' } : null),
      savePlan,
    });
    render(<TodayPage today="2026-09-22" repository={learningRepository} />);
    await waitFor(() => expect(savePlan).toHaveBeenCalled());
    expect(savePlan).toHaveBeenLastCalledWith(expect.objectContaining({ vocabularySession: expect.objectContaining({ wordIds: ['v0001'], phase: 'testing' }) }));
    expect(screen.getByRole('link', { name: '继续严格检测 →' })).toHaveAttribute('href', expect.stringContaining('practice/vocabulary'));
    expect(screen.getByRole('heading', { name: '高频词汇与重点搭配' }).closest('article')).toHaveTextContent(/1 个高频新词（已学 1 个）.*个新搭配.*0 个旧词/);
  });

  it('shows an expandable seven-day learning report from saved progress', async () => {
    render(<TodayPage today="2026-09-27" repository={repository({
      attempts: [{ id: 'weekly-1', userId: 'local', questionId: 'q1', response: 'A', correct: false, score: 0, durationSeconds: 10, kind: 'listening', mode: 'practice', createdAt: '2026-09-27T01:00:00.000Z' }],
      knowledgeStates: [{ id: 'k1', itemId: 'v1', status: 'mastered', favorite: false, lapseCount: 1, updatedAt: '2026-09-27T01:00:00.000Z' }],
    })} />);
    const summary = await screen.findByText('本周学习报告');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    summary.closest('summary')?.click();
    expect(screen.getByRole('region', { name: '本周概览' })).toHaveTextContent('1 / 7');
    expect(screen.getByText('听力 · 1 次')).toBeVisible();
    expect(screen.getByText(/再完成 3 次整套模考/)).toBeVisible();
  });

  it('asks for school-notice exam-date confirmation and hides the card after confirmation', async () => {
    const learningRepository = repository();
    render(<TodayPage today="2026-09-27" repository={learningRepository} />);
    expect(await screen.findByText('请确认本校考试日期')).toBeVisible();
    expect(screen.getByText(/2026 年 12 月 12 日/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '日期正确，确认' }));
    await waitFor(() => expect(screen.queryByText('请确认本校考试日期')).not.toBeInTheDocument());
  });

  it('shows the countdown and the four-part 60-minute plan', () => {
    render(<TodayPage today="2026-09-22" examDate="2026-12-12" />);
    expect(screen.getByText('81')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '今日学习路线' })).toBeInTheDocument();
    expect(screen.getByText('60 分钟 · 按顺序完成效果更稳')).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(6);
    expect(screen.getByText('正在积累数据')).toBeVisible();
  });

  it('does not offer manual completion controls', async () => {
    render(<TodayPage today="2026-09-22" repository={repository()} />);
    expect(await screen.findAllByText(/未完成|待解锁/)).toHaveLength(6);
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

  it('lets recent weakness evidence replace an unfinished carried task', async () => {
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
    await waitFor(() => expect(screen.getByText(/近期表现补强/)).toBeVisible());
    expect(screen.queryByText('昨日顺延')).not.toBeInTheDocument();
  });

  it('replaces a diagnostic grammar slot with a real collocation task', async () => {
    render(<TodayPage today="2026-09-24" repository={repository({
      settings: { ...snapshot.settings, diagnosticCompletedAt: '2026-09-23T09:00:00.000Z', diagnosticLevels: { vocabulary: 0.67, grammar: 0.33, listening: 0.67, reading: 1 } },
    })} />);

    expect(await screen.findByText('优先加强重点搭配')).toBeVisible();
    expect(screen.getByRole('heading', { name: '重点搭配' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '重点搭配' }).closest('article')?.querySelector('a')).toHaveAttribute('href', expect.stringContaining('practice/collocation'));
    expect(screen.queryByRole('heading', { name: '重点语法' })).not.toBeInTheDocument();
  });

  it('shows the estimated score, pass gap, two weak skills, and diagnostic adaptation reason', async () => {
    render(<TodayPage today="2026-09-24" repository={repository({
      settings: { ...snapshot.settings, diagnosticCompletedAt: diagnosticProfile.completedAt, diagnosticProfile },
    })} />);

    expect(await screen.findByText('预计 319 分')).toBeVisible();
    expect(screen.getByText('参考区间 264～374')).toBeVisible();
    expect(screen.getByText('初步可信度 · 20 道诊断题')).toBeVisible();
    expect(screen.getByText('按训练估算，距 425 参考线约 106 分')).toBeVisible();
    expect(screen.getByText('当前优先补强：写作、听力')).toBeVisible();
    expect(screen.getByRole('link', { name: '重新诊断' })).toHaveAttribute('href', expect.stringContaining('diagnostic'));
    expect(screen.getByRole('heading', { name: '短文写作' }).closest('article')).toHaveTextContent('诊断补强 · 正确率 20%');
  });

  it('recommends a fresh diagnostic after 21 days', async () => {
    render(<TodayPage today="2026-10-15" repository={repository({
      settings: { ...snapshot.settings, diagnosticCompletedAt: diagnosticProfile.completedAt, diagnosticProfile },
    })} />);
    expect(await screen.findByText(/诊断结果已超过 21 天/)).toBeVisible();
  });

  it('shows the adaptive new-word quota and due old-word count', async () => {
    render(<TodayPage today="2026-09-25" repository={repository({
      knowledgeStates: [{ id: 'knowledge:v0001', itemId: 'v0001', status: 'mastered', favorite: false, nextReviewAt: '2026-09-24T00:00:00.000Z', updatedAt: '2026-09-23T00:00:00.000Z' }],
    })} />);
    expect(await screen.findByText('高频旧词巩固 1 个')).toBeVisible();
    expect(screen.getByText(/今日高频新词 \d+ 个/)).toBeVisible();
    expect(screen.getByText('高频词未首轮学习 799 个')).toBeVisible();
    expect(screen.getByText('高频词尚未稳定掌握 799 个')).toBeVisible();
    expect(screen.getByText(/学习一天、第二天优先复习/)).toBeVisible();
    const vocabularyMinutes = Number(screen.getByRole('heading', { name: '高频词汇与重点搭配' }).closest('article')?.querySelector(':scope > b')?.textContent?.match(/\d+/)?.[0]);
    const foundationMinutes = Number(screen.getByRole('heading', { name: '基础必会词' }).closest('article')?.querySelector(':scope > b')?.textContent?.match(/\d+/)?.[0]);
    expect(vocabularyMinutes + foundationMinutes).toBe(25);
  });

  it('warns when the capped daily pace cannot finish before the exam', async () => {
    render(<TodayPage today="2026-12-10" repository={repository()} />);
    expect(await screen.findByText(/当前进度偏慢/)).toHaveTextContent('每天至少 800 个');
  });

  it('celebrates a completed high-frequency vocabulary list without assigning new words', async () => {
    render(<TodayPage today="2026-09-25" repository={repository({
      knowledgeStates: learningVocabulary.map((word) => ({ id: `knowledge:${word.id}`, itemId: word.id, status: 'mastered', favorite: false, nextReviewAt: '2026-12-30T00:00:00.000Z', updatedAt: '2026-09-25T00:00:00.000Z' })),
    })} />);
    expect(await screen.findByText('今日高频新词 0 个')).toBeVisible();
    expect(screen.getByText('800 个高频词已完成首轮接触')).toBeVisible();
    expect(screen.getByText('高频词尚未稳定掌握 0 个')).toBeVisible();
  });
});
