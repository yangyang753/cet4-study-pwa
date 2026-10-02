import { useEffect, useState } from 'react';
import { DexieLearningRepository } from '../data/repositories/DexieLearningRepository';
import type { LearningRepository } from '../data/repositories/LearningRepository';
import { deriveShellSummary, type ShellSummary } from './deriveShellSummary';

const defaultRepository = new DexieLearningRepository();
const emptySummary: ShellSummary = { completed: 0, total: 5, dueReviews: 0, daysToExam: 0, phaseLabel: '学习准备中' };
const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export function SidebarStudySummary({ repository = defaultRepository, today = localDate() }: { repository?: LearningRepository; today?: string }) {
  const [summary, setSummary] = useState(emptySummary);

  useEffect(() => {
    let active = true;
    void repository.getDashboardSnapshot(`${today}T23:59:59.999Z`).then((snapshot) => {
      if (active) setSummary(deriveShellSummary(snapshot, today));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [repository, today]);

  const percentage = Math.round((summary.completed / summary.total) * 100);
  return (
    <section className="sidebar-study-summary" aria-label="今日学习概览">
      <div className="sidebar-summary-heading"><span>今日进度</span><strong>{summary.completed}/{summary.total}</strong></div>
      <div className="sidebar-progress" role="progressbar" aria-label="今日学习进度" aria-valuemin={0} aria-valuemax={summary.total} aria-valuenow={summary.completed}>
        <span style={{ width: `${percentage}%` }} />
      </div>
      <dl>
        <div><dt>待复习</dt><dd>{summary.dueReviews} 项</dd></div>
        <div><dt>距考试</dt><dd>{summary.daysToExam} 天</dd></div>
      </dl>
      <p><span aria-hidden="true">●</span>{summary.phaseLabel}</p>
    </section>
  );
}
