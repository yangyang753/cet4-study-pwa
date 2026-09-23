import { useEffect, useMemo, useState } from 'react';
import { daysUntil, planDay, type StudyKind } from '../planner/planDay';
import { ProgressCards } from './ProgressCards';
import { deriveDashboard } from './deriveDashboard';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { DashboardSnapshot } from '../../domain/learning';
import './dashboard.css';

const defaultRepository = new DexieLearningRepository();
const taskCopy: Record<StudyKind, { icon: string; title: string; detail: string; href: string }> = {
  vocabulary: { icon: 'Aa', title: '高频词汇与词性', detail: '10 个核心词 + 5 道词性判断', href: 'practice/vocabulary' },
  listening: { icon: '♫', title: '长对话精听', detail: '校园活动 · 转折信号定位', href: 'listen' },
  reading: { icon: '▥', title: '仔细阅读', detail: '1 篇 · 主旨与细节', href: 'practice/reading' },
  translation: { icon: '译', title: '段落翻译', detail: '主干分析与高频表达', href: 'practice/translation' },
  writing: { icon: '✎', title: '短文写作', detail: '观点、理由与总结', href: 'practice/writing' },
  review: { icon: '↻', title: '错题回顾', detail: '今日到期的薄弱知识点', href: 'review' },
  mock: { icon: '✓', title: '限时模拟', detail: '按考试节奏完成混合训练', href: 'exam' },
};

export function TodayPage({ today = new Date().toISOString().slice(0, 10), examDate, repository = defaultRepository }: { today?: string; examDate?: string; repository?: LearningRepository }) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  useEffect(() => {
    if (!('indexedDB' in globalThis)) return;
    let current = true;
    repository.getDashboardSnapshot().then((value) => { if (current) setSnapshot(value); }).catch(() => undefined);
    return () => { current = false; };
  }, [repository]);
  const metrics = useMemo(() => deriveDashboard(snapshot?.attempts ?? [], snapshot?.completions ?? [], today), [snapshot, today]);
  const targetDate = examDate ?? snapshot?.settings.examDate ?? '2026-12-12';
  const dailyMinutes = snapshot?.settings.dailyMinutes ?? 60;
  const weakKind = metrics.weakSkill?.kind as StudyKind | undefined;
  const plan = planDay({ date: today, examDate: targetDate, dailyMinutes, weakSkill: weakKind ?? 'listening', unfinished: [] });

  const markComplete = async (taskId: string, kind: StudyKind) => {
    const completion = { id: `${today}:${taskId}`, date: today, taskId, kind, completedAt: new Date().toISOString() };
    await repository.completeTask(completion);
    setSnapshot((current) => current ? { ...current, completions: [...current.completions.filter((item) => item.taskId !== taskId), completion] } : current);
  };

  return <div className="today-page"><header className="page-heading"><div><h1>下午好，继续向 425 分前进</h1><p>今天只需要专注 {dailyMinutes} 分钟。</p></div><a className="avatar" href={`${import.meta.env.BASE_URL}account`} aria-label="账户与同步">L</a></header><section className="dashboard-hero"><div className="focus-card"><span>今日重点</span><h2>{metrics.weakSkill ? `优先加强${taskCopy[weakKind ?? 'listening'].title}` : '先建立学习记录，再定位薄弱项'}</h2><p>完成今天的练习后，计划会自动调整。</p><a className="focus-action" href={`${import.meta.env.BASE_URL}listen`}>开始今日训练 →</a><a className="knowledge-action" href={`${import.meta.env.BASE_URL}knowledge`}>先看高频知识</a></div><div className="countdown-card"><span>距离考试</span><strong>{daysUntil(today, targetDate)}</strong><b>天</b><h3>{plan.phase === 'foundation' ? '基础补强期' : plan.phase === 'breakthrough' ? '题型突破期' : '冲刺模拟期'}</h3></div></section><section className="dashboard-grid"><div className="task-panel"><h2>今日 {dailyMinutes} 分钟计划</h2>{plan.tasks.map((task) => { const copy = taskCopy[task.kind]; const completed = metrics.completedTaskIds.has(task.id); return <article key={task.id} className={`task-card ${completed ? 'completed' : ''}`}><span className="task-icon">{copy.icon}</span><div><h3>{copy.title}</h3><p>{copy.detail}</p><a href={`${import.meta.env.BASE_URL}${copy.href}`}>{completed ? '再次练习' : '开始任务'}</a></div><b>{task.minutes} 分钟</b><button disabled={completed} onClick={() => void markComplete(task.id, task.kind)}>{completed ? '已完成' : '标记完成'}</button></article>; })}</div><ProgressCards metrics={metrics} /></section></div>;
}
