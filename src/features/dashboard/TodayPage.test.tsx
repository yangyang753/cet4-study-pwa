import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
    expect(await screen.findByRole('link', { name: '先学高频词 →' })).toHaveAttribute('href', expect.stringContaining('practice/vocabulary'));
    expect(screen.getByText(/先复习旧词和重点搭配，再学新内容/)).toBeVisible();
  });

  it('shows the countdown and the four-part 60-minute plan', () => {
    render(<TodayPage today="2026-09-22" examDate="2026-12-12" />);
    expect(screen.getByText('81')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /今日 60 分钟计划/ })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getByText('正在积累数据')).toBeVisible();
  });

  it('does not offer manual completion controls', async () => {
    render(<TodayPage today="2026-09-22" repository={repository()} />);
    expect(await screen.findAllByText('未完成')).toHaveLength(4);
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

  it('uses the diagnostic weakness before enough recent attempts exist', async () => {
    render(<TodayPage today="2026-09-24" repository={repository({
      settings: { ...snapshot.settings, diagnosticCompletedAt: '2026-09-23T09:00:00.000Z', diagnosticLevels: { vocabulary: 0.67, grammar: 0.33, listening: 0.67, reading: 1 } },
    })} />);

    expect(await screen.findByText('优先加强重点语法')).toBeVisible();
    expect(screen.getByRole('heading', { name: '重点语法' })).toBeVisible();
  });

  it('shows the estimated score, pass gap, two weak skills, and diagnostic adaptation reason', async () => {
    render(<TodayPage today="2026-09-24" repository={repository({
      settings: { ...snapshot.settings, diagnosticCompletedAt: diagnosticProfile.completedAt, diagnosticProfile },
    })} />);

    expect(await screen.findByText('预计 319 分')).toBeVisible();
    expect(screen.getByText('参考区间 264～374')).toBeVisible();
    expect(screen.getByText('距离 425 分还差 106 分')).toBeVisible();
    expect(screen.getByText('当前优先补强：写作、听力')).toBeVisible();
    expect(screen.getByRole('link', { name: '重新诊断' })).toHaveAttribute('href', expect.stringContaining('diagnostic'));
    expect(screen.getByRole('heading', { name: '短文写作' }).closest('article')).toHaveTextContent('诊断补强 · 正确率 20%');
  });

  it('shows the adaptive new-word quota and due old-word count', async () => {
    render(<TodayPage today="2026-09-25" repository={repository({
      knowledgeStates: [{ id: 'knowledge:v0001', itemId: 'v0001', status: 'mastered', favorite: false, nextReviewAt: '2026-09-24T00:00:00.000Z', updatedAt: '2026-09-23T00:00:00.000Z' }],
    })} />);
    expect(await screen.findByText('今日复习 1/1 个')).toBeVisible();
    expect(screen.getByText('今日新词 15 个')).toBeVisible();
    expect(screen.getByText('还剩 799 个高频词')).toBeVisible();
    expect(screen.getByText(/预计.*前完成首轮/)).toBeVisible();
    expect(screen.getByText(/预计.*前完成稳定掌握/)).toBeVisible();
    expect(screen.getByText(/仍需完成.*次巩固检测/)).toBeVisible();
    expect(screen.getByText('425 参考线 · 450 安全目标')).toBeVisible();
    expect(screen.getByRole('heading', { name: '高频词汇与词性' }).closest('article')).toHaveTextContent('24 分钟');
  });

  it('warns when the capped daily pace cannot finish before the exam', async () => {
    render(<TodayPage today="2026-12-10" repository={repository()} />);
    expect(await screen.findByText(/按当前上限无法在考试前完成首轮/)).toHaveTextContent('每天至少 800 个');
  });

  it('celebrates a completed high-frequency vocabulary list without assigning new words', async () => {
    render(<TodayPage today="2026-09-25" repository={repository({
      knowledgeStates: learningVocabulary.map((word) => ({ id: `knowledge:${word.id}`, itemId: word.id, status: 'mastered', favorite: false, nextReviewAt: '2026-12-30T00:00:00.000Z', updatedAt: '2026-09-25T00:00:00.000Z' })),
    })} />);
    expect(await screen.findByText('今日新词 0 个')).toBeVisible();
    expect(screen.getByText('800 个高频词已进入巩固复习')).toBeVisible();
  });
});
