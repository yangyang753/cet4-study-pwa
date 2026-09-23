import type { DashboardMetrics } from './deriveDashboard';

const skillNames: Record<string, string> = { listening: '听力', reading: '阅读', vocabulary: '词汇', grammar: '语法', writing: '写作', translation: '翻译' };

export function ProgressCards({ metrics }: { metrics: DashboardMetrics }) {
  return <aside className="progress-card"><h2>学习状态</h2><div className="streak"><span>连续学习</span><strong>{metrics.streak} 天</strong></div><h3>当前薄弱项</h3>{!metrics.hasEnoughData || !metrics.weakSkill ? <p>正在积累数据</p> : <><p>{skillNames[metrics.weakSkill.kind] ?? metrics.weakSkill.kind} <b>{Math.round(metrics.weakSkill.accuracy * 100)}%</b></p><div className="meter"><i style={{ width: `${Math.round(metrics.weakSkill.accuracy * 100)}%` }} /></div><small>根据最近 {metrics.weakSkill.attempts} 次有效作答计算</small></>}</aside>;
}
