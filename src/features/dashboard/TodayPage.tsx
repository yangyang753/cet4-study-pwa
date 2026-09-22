import { daysUntil, planDay, type StudyKind } from '../planner/planDay';
import { ProgressCards } from './ProgressCards';
import './dashboard.css';

const taskCopy: Record<StudyKind, { icon: string; title: string; detail: string }> = {
  vocabulary: { icon: 'Aa', title: '高频词汇与词性', detail: '10 个核心词 + 5 道词性判断' },
  listening: { icon: '♫', title: '长对话精听', detail: '校园活动 · 转折信号定位' },
  reading: { icon: '▥', title: '仔细阅读', detail: '1 篇 · 主旨与细节' },
  translation: { icon: '译', title: '段落翻译', detail: '主干分析与高频表达' },
  writing: { icon: '✎', title: '短文写作', detail: '观点、理由与总结' },
  review: { icon: '↻', title: '错题回顾', detail: '昨天的薄弱知识点' },
  mock: { icon: '✓', title: '限时模拟', detail: '按考试节奏完成混合训练' },
};

export function TodayPage({ today = new Date().toISOString().slice(0, 10), examDate = '2026-12-12' }: { today?: string; examDate?: string }) {
  const plan = planDay({ date: today, examDate, dailyMinutes: 60, weakSkill: 'listening', unfinished: [] });
  return <div className="today-page"><header className="page-heading"><div><h1>下午好，继续向 425 分前进</h1><p>今天只需要专注 60 分钟。</p></div><span className="avatar">L</span></header><section className="dashboard-hero"><div className="focus-card"><span>今日重点</span><h2>先听懂转折，再做对细节题</h2><p>关注 however、but、actually 后的信息</p><a className="focus-action" href="/listen">开始今日训练 →</a><a className="knowledge-action" href="/knowledge">先看高频知识</a></div><div className="countdown-card"><span>距离考试</span><strong>{daysUntil(today, examDate)}</strong><b>天</b><h3>{plan.phase === 'foundation' ? '基础补强期' : plan.phase === 'breakthrough' ? '题型突破期' : '冲刺模拟期'}</h3></div></section><section className="dashboard-grid"><div className="task-panel"><h2>今日 60 分钟计划</h2>{plan.tasks.map((task) => { const copy = taskCopy[task.kind]; return <article key={task.id} className="task-card"><span className="task-icon">{copy.icon}</span><div><h3>{copy.title}</h3><p>{copy.detail}</p></div><b>{task.minutes} 分钟</b></article>; })}</div><ProgressCards /></section></div>;
}
