import type { WeeklyLearningReport as WeeklyReport } from './weeklyLearningReport';

const kindLabels = { vocabulary: '词汇', grammar: '语法', listening: '听力', reading: '阅读', writing: '写作', translation: '翻译' } as const;

export function WeeklyLearningReport({ report }: { report: WeeklyReport }) {
  return <details className="weekly-report">
    <summary><span><b>本周学习报告</b><small>近 7 天 · {report.activeDays} 天有学习记录</small></span><strong>{report.attemptCount} 次练习</strong></summary>
    <div className="weekly-report-body">
      <section aria-label="本周概览" className="weekly-report-stats">
        <div><span>活跃天数</span><b>{report.activeDays} / 7</b></div>
        <div><span>已掌握知识</span><b>{report.masteredCount}</b></div>
        <div><span>遗忘回退</span><b>{report.lapseCount}</b></div>
        <div><span>近 3 次最低估分</span><b>{report.recentMockMinimum ?? '样本不足'}</b></div>
      </section>
      <section aria-labelledby="weekly-accuracy-title">
        <h3 id="weekly-accuracy-title">分项表现</h3>
        {report.accuracyByKind.length ? <ul className="weekly-accuracy-list">{report.accuracyByKind.map((item) => <li key={item.kind}><span>{kindLabels[item.kind]} · {item.attempts} 次</span><b>{Math.round(item.accuracy * 100)}%</b><i aria-hidden="true"><span style={{ width: `${Math.round(item.accuracy * 100)}%` }} /></i></li>)}</ul> : <p>本周还没有可评分练习，完成一次训练后这里会自动更新。</p>}
      </section>
      <p className="weekly-priority"><b>下周优先：</b>{report.priorities.length ? report.priorities.map((kind) => kindLabels[kind]).join('、') : '先完成今日计划，积累可分析数据。'}</p>
      {report.recentMockScores.length > 0 && <p className="weekly-priority"><b>模考估分轨迹：</b>{[...report.recentMockScores].reverse().join(' → ')}{report.mockTrend && ` · ${report.mockTrend === 'improving' ? '明显上升' : report.mockTrend === 'declining' ? '近期下降，需优先补弱项' : '基本稳定'}`}</p>}
      {report.mockSampleCount < 3 && <small className="weekly-note">再完成 {3 - report.mockSampleCount} 次整套模考后，才显示近 3 次最低估分；备考估分不是官方成绩。</small>}
    </div>
  </details>;
}
