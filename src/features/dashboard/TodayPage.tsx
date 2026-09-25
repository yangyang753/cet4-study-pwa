import { useEffect, useMemo, useState } from 'react';
import { carryoverFromPlan, daysUntil, planDay, type StudyKind } from '../planner/planDay';
import { ProgressCards } from './ProgressCards';
import { deriveDashboard } from './deriveDashboard';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { DashboardSnapshot } from '../../domain/learning';
import type { CachedPlan } from '../../data/localDb';
import { previousStudyDate, studyDate } from '../../lib/studyDate';
import { selectDiagnosticWeakSkill } from '../diagnostic/diagnostic';
import { ExamReadiness } from './ExamReadiness';
import './dashboard.css';
import { learningVocabulary } from '../../content/vocabularyLearning';
import { buildVocabularyWorkload } from '../vocabulary/vocabularySchedule';

const defaultRepository = new DexieLearningRepository();
const taskCopy: Record<StudyKind, { icon: string; title: string; detail: string; href: string }> = {
  vocabulary: { icon: 'Aa', title: '高频词汇与词性', detail: '10 个核心词 + 5 道词性判断', href: 'practice/vocabulary' },
  grammar: { icon: 'Gr', title: '重点语法', detail: '找主干并检查句子形式', href: 'practice/grammar' },
  listening: { icon: '♫', title: '长对话精听', detail: '校园活动 · 转折信号定位', href: 'listen' },
  reading: { icon: '▥', title: '仔细阅读', detail: '1 篇 · 主旨与细节', href: 'practice/reading' },
  translation: { icon: '译', title: '段落翻译', detail: '主干分析与高频表达', href: 'practice/translation' },
  writing: { icon: '✎', title: '短文写作', detail: '观点、理由与总结', href: 'practice/writing' },
  review: { icon: '↻', title: '错题回顾', detail: '今日到期的薄弱知识点', href: 'review' },
  mock: { icon: '✓', title: '限时模拟', detail: '按考试节奏完成混合训练', href: 'exam' },
};

export function TodayPage({ today = studyDate(), examDate, repository = defaultRepository }: { today?: string; examDate?: string; repository?: LearningRepository }) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [previousPlan, setPreviousPlan] = useState<CachedPlan | null | undefined>(undefined);
  useEffect(() => {
    if (!('indexedDB' in globalThis)) return;
    let current = true;
    repository.getDashboardSnapshot().then((value) => { if (current) setSnapshot(value); }).catch(() => undefined);
    return () => { current = false; };
  }, [repository]);
  useEffect(() => {
    let current = true;
    repository.getPlan(previousStudyDate(today)).then((value) => { if (current) setPreviousPlan(value); }).catch(() => { if (current) setPreviousPlan(null); });
    return () => { current = false; };
  }, [repository, today]);
  const metrics = useMemo(() => deriveDashboard(snapshot?.attempts ?? [], snapshot?.completions ?? [], today), [snapshot, today]);
  const targetDate = examDate ?? snapshot?.settings.examDate ?? '2026-12-12';
  const dailyMinutes = snapshot?.settings.dailyMinutes ?? 60;
  const weakKind: StudyKind | undefined = metrics.weakSkill?.kind;
  const diagnosticWeakKind = selectDiagnosticWeakSkill(snapshot?.settings.diagnosticLevels) ?? undefined;
  const focusKind = metrics.hasEnoughData ? weakKind : diagnosticWeakKind;
  const unfinished = carryoverFromPlan(previousPlan?.tasks ?? [], metrics.completedTaskIds);
  const plan = planDay({ date: today, examDate: targetDate, dailyMinutes, weakSkill: weakKind ?? 'listening', diagnosticWeakSkill: diagnosticWeakKind, hasRecentEvidence: metrics.hasEnoughData, unfinished });
  const vocabularyWorkload = snapshot ? buildVocabularyWorkload(learningVocabulary, snapshot.knowledgeStates, today, targetDate) : null;
  useEffect(() => {
    if (!snapshot || previousPlan === undefined) return;
    void repository.savePlan({ id: `plan:${today}`, date: today, tasks: plan.tasks, updatedAt: new Date().toISOString() });
  }, [plan.tasks, previousPlan, repository, snapshot, today]);

  return <div className="today-page">
    <header className="page-heading"><div><h1>下午好，向目标 425 分前进</h1><p>今天只需要专注 {dailyMinutes} 分钟。</p></div><a className="avatar" href={`${import.meta.env.BASE_URL}account`} aria-label="账户与同步">L</a></header>
    {snapshot && !snapshot.settings.diagnosticCompletedAt && <aside className="cloud-notice"><strong>先做 10～15 分钟基础诊断</strong><p>系统会据此安排第一周学习重点；也可以稍后再做。</p><a href={`${import.meta.env.BASE_URL}diagnostic`}>开始基础诊断</a></aside>}
    <section className="dashboard-hero"><div className="focus-card"><span>今日重点</span><h2>{focusKind ? `优先加强${taskCopy[focusKind].title}` : '先建立学习记录，再定位薄弱项'}</h2><p>先复习旧词，再学新词并完成段落翻译；漏译和拼写错误会自动加入错题复习。</p>{vocabularyWorkload && <div className="vocabulary-workload" aria-label="今日词汇安排"><b>今日旧词 {vocabularyWorkload.dueWords.length} 个</b><b>今日新词 {vocabularyWorkload.newWords.length} 个</b><span>{vocabularyWorkload.remainingWords === 0 ? `${learningVocabulary.length} 个高频词已进入巩固复习` : `还剩 ${vocabularyWorkload.remainingWords} 个高频词`}</span>{vocabularyWorkload.remainingWords > 0 && <span>预计 {vocabularyWorkload.projectedCompletionDate} 前完成首轮</span>}<small>425 参考线 · 450 安全目标</small></div>}<a className="focus-action" href={`${import.meta.env.BASE_URL}practice/vocabulary`}>先学高频词 →</a><a className="knowledge-action" href={`${import.meta.env.BASE_URL}knowledge`}>查看高频知识</a></div><div className="countdown-card"><span>距离考试</span><strong>{daysUntil(today, targetDate)}</strong><b>天</b><h3>{plan.phase === 'foundation' ? '基础补强期' : plan.phase === 'breakthrough' ? '题型突破期' : '冲刺模拟期'}</h3></div></section>
    {snapshot && <ExamReadiness settings={snapshot.settings} today={today} repository={repository} />}
    <section className="dashboard-grid"><div className="task-panel"><h2>今日 {dailyMinutes} 分钟计划</h2>{plan.tasks.map((task) => {
      const copy = taskCopy[task.kind];
      const detail = task.kind === 'vocabulary' && vocabularyWorkload ? `${vocabularyWorkload.newWords.length} 个新词 + ${vocabularyWorkload.dueWords.length} 个旧词复习` : copy.detail;
      const completed = metrics.completedTaskIds.has(task.id);
      const mastery = snapshot?.knowledgeStates.find((item) => item.itemId === task.id)?.status;
      const status = mastery === 'mastered' ? '已掌握' : mastery === 'review' ? '需要复习' : completed ? '待检测' : '未完成';
      const carried = !task.id.startsWith(`${today}:`);
      return <article key={task.id} className={`task-card ${mastery ?? (completed ? 'completed' : '')}`}><span className="task-icon">{copy.icon}</span><div><h3>{copy.title}</h3><p>{detail}</p>{carried && <small>昨日顺延</small>}{completed ? <a href={`${import.meta.env.BASE_URL}mastery/${task.kind}?taskId=${encodeURIComponent(task.id)}`}>{mastery === 'mastered' ? '再次检测' : '开始掌握检测'}</a> : <a href={`${import.meta.env.BASE_URL}${copy.href}`}>开始任务</a>}</div><b>{task.minutes} 分钟</b><span className={`task-status ${mastery ?? (completed ? 'pending' : 'idle')}`}>{status}</span></article>;
    })}</div><ProgressCards metrics={metrics} /></section>
  </div>;
}
