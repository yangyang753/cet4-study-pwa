import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { carryoverFromPlan, daysUntil, planDay, type StudyKind } from '../planner/planDay';
import { ProgressCards } from './ProgressCards';
import { deriveDashboard } from './deriveDashboard';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { DashboardSnapshot } from '../../domain/learning';
import type { CachedPlan } from '../../data/localDb';
import { previousStudyDate, studyDate } from '../../lib/studyDate';
import { selectDiagnosticWeakSkill } from '../diagnostic/diagnostic';
import { deriveAdaptivePriorities } from '../diagnostic/adaptivePriorities';
import './dashboard.css';
import { learningVocabulary } from '../../content/vocabularyLearning';
import { buildVocabularyWorkload } from '../vocabulary/vocabularySchedule';
import { cultureTranslationBank } from '../../content/cultureTranslations';
import { selectDailyCultureTranslation, type CultureTranslationPrompt } from '../translation/cultureTranslation';
import { appHref } from '../../lib/appHref';
import { buildWeeklyLearningReport } from './weeklyLearningReport';
import { WeeklyLearningReport } from './WeeklyLearningReportPanel';
import { ExamDateConfirmation } from '../settings/ExamDateConfirmation';
import collocationData from '../../../content/v1/collocations.json';
import { buildCollocationWorkload, type CollocationEntry } from '../collocations/collocationPractice';

const defaultRepository = new DexieLearningRepository();
export function greetingForHour(hour: number) {
  if (hour < 11) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
}
const taskCopy: Record<StudyKind, { icon: string; title: string; detail: string; href: string }> = {
  vocabulary: { icon: 'Aa', title: '高频词汇与重点搭配', detail: '新词、旧词与重点搭配联合检测', href: 'practice/vocabulary' },
  culture: { icon: '译', title: '中国文化中译英', detail: '完成高频词后解锁 · 独立翻译任务', href: 'culture' },
  collocation: { icon: 'Co', title: '重点搭配', detail: '整体记忆搭配并在语境中检测', href: 'practice/collocation' },
  grammar: { icon: 'Gr', title: '重点语法', detail: '找主干并检查句子形式', href: 'practice/grammar' },
  listening: { icon: '♫', title: '长对话精听', detail: '校园活动 · 转折信号定位', href: 'listen' },
  reading: { icon: '▥', title: '仔细阅读', detail: '1 篇 · 主旨与细节', href: 'practice/reading' },
  translation: { icon: '译', title: '段落翻译', detail: '主干分析与高频表达', href: 'practice/translation' },
  writing: { icon: '✎', title: '短文写作', detail: '观点、理由与总结', href: 'practice/writing' },
  review: { icon: '↻', title: '错题回顾', detail: '今日到期的薄弱知识点', href: 'review' },
  mock: { icon: '✓', title: '限时模拟', detail: '按考试节奏完成混合训练', href: 'exam' },
};
const priorityLabels = { vocabulary: '词汇', grammar: '语法', listening: '听力', reading: '阅读', writing: '写作', translation: '翻译' } as const;

export function TodayPage({ today = studyDate(), examDate, repository = defaultRepository }: { today?: string; examDate?: string; repository?: LearningRepository }) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [previousPlan, setPreviousPlan] = useState<CachedPlan | null | undefined>(undefined);
  const [currentPlan, setCurrentPlan] = useState<CachedPlan | null | undefined>(undefined);
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
  useEffect(() => {
    let current = true;
    repository.getPlan(today).then((value) => { if (current) setCurrentPlan(value); }).catch(() => { if (current) setCurrentPlan(null); });
    return () => { current = false; };
  }, [repository, today]);
  const metrics = useMemo(() => deriveDashboard(snapshot?.attempts ?? [], snapshot?.completions ?? [], today), [snapshot, today]);
  const weeklyReport = useMemo(() => snapshot ? buildWeeklyLearningReport(snapshot, today) : null, [snapshot, today]);
  const targetDate = examDate ?? snapshot?.settings.examDate ?? '2026-12-12';
  const dailyMinutes = Math.max(20, snapshot?.settings.dailyMinutes ?? 60);
  const weakKind: StudyKind | undefined = metrics.weakSkill?.kind;
  const diagnosticWeakKind = selectDiagnosticWeakSkill(snapshot?.settings.diagnosticLevels) ?? undefined;
  const priorities = useMemo(() => deriveAdaptivePriorities(snapshot?.settings.diagnosticProfile, snapshot?.attempts ?? [], `${today}T23:59:59.999Z`), [snapshot, today]);
  const rawFocusKind = priorities[0]?.kind ?? (metrics.hasEnoughData ? weakKind : diagnosticWeakKind);
  const focusKind: StudyKind | undefined = rawFocusKind === 'grammar' ? 'collocation' : rawFocusKind;
  const unfinished = carryoverFromPlan(previousPlan?.tasks ?? [], metrics.completedTaskIds);
  const dailyCulturePrompt = selectDailyCultureTranslation(cultureTranslationBank as CultureTranslationPrompt[], today);
  const vocabularyWorkload = snapshot ? buildVocabularyWorkload(learningVocabulary, snapshot.knowledgeStates, today, targetDate, dailyMinutes, {
    cultureWordIds: dailyCulturePrompt.targetWordIds,
    completedVocabularySessions: (snapshot.completions ?? []).filter((item) => item.kind === 'vocabulary').length,
  }) : null;
  const collocationWorkload = snapshot && vocabularyWorkload ? buildCollocationWorkload(collocationData as CollocationEntry[], snapshot.knowledgeStates, today, targetDate, vocabularyWorkload.reviewOnlyDay) : null;
  const vocabularySession = currentPlan?.vocabularySession;
  const dailyVocabularyCount = vocabularySession?.wordIds.length ?? vocabularyWorkload?.newWords.length ?? 0;
  const learnedVocabularyCount = vocabularySession?.learnedWordIds.length ?? 0;
  const vocabularyAction = vocabularySession?.phase === 'complete' ? '今日词汇搭配已完成' : vocabularySession?.phase === 'collocations' ? '继续重点搭配 →' : vocabularySession?.phase === 'testing' ? '继续严格检测 →' : learnedVocabularyCount > 0 ? '继续今日学习 →' : vocabularyWorkload?.reviewOnlyDay ? '开始集中巩固 →' : '学习高频词与搭配 →';
  const diagnosticAgeDays = snapshot?.settings.diagnosticCompletedAt ? Math.floor((Date.parse(`${today}T23:59:59.999Z`) - Date.parse(snapshot.settings.diagnosticCompletedAt)) / 86_400_000) : 0;
  const attemptsSinceDiagnostic = snapshot?.settings.diagnosticCompletedAt ? (snapshot.attempts ?? []).filter((attempt) => Date.parse(attempt.createdAt) > Date.parse(snapshot.settings.diagnosticCompletedAt!)).length : 0;
  const diagnosticRetestDue = diagnosticAgeDays >= 21 || attemptsSinceDiagnostic >= 30;
  const plan = planDay({ date: today, examDate: targetDate, dailyMinutes, weakSkill: weakKind ?? 'listening', diagnosticWeakSkill: diagnosticWeakKind, hasRecentEvidence: metrics.hasEnoughData, unfinished, vocabularyMinutes: vocabularyWorkload?.estimatedMinutes, priorities });
  const plannedMinutes = plan.tasks.reduce((sum, task) => sum + task.minutes, 0);
  const completedToday = plan.tasks.filter((task) => metrics.completedTaskIds.has(task.id)).length;
  const completionPercent = plan.tasks.length ? Math.round((completedToday / plan.tasks.length) * 100) : 0;
  const vocabularyCompleted = Boolean(vocabularySession && ['complete', 'culture-review', 'culture-translation', 'collocations'].includes(vocabularySession.phase)) || metrics.completedTaskIds.has(`${today}:vocabulary`);
  useEffect(() => {
    if (!snapshot || previousPlan === undefined || currentPlan === undefined) return;
    void repository.savePlan({ id: `plan:${today}`, date: today, tasks: plan.tasks, ...(currentPlan?.vocabularySession ? { vocabularySession: currentPlan.vocabularySession } : {}), updatedAt: new Date().toISOString() });
  }, [currentPlan, plan.tasks, previousPlan, repository, snapshot, today]);

  return <div className="today-page">
    <header className="page-heading"><div><span className="page-eyebrow">CET-4 · DAILY MISSION</span><h1>{greetingForHour(new Date().getHours())}，向目标 425 分前进</h1><p>{plannedMinutes > dailyMinutes ? `今天是每周整套模考日，请预留 ${plannedMinutes} 分钟。` : `今天只需要专注 ${dailyMinutes} 分钟。`}</p></div><a className="avatar" href={appHref('account')} aria-label="账户与同步"><span>L</span><small>学习档案</small></a></header>
    <section className="today-overview" aria-label="今日备考概览">
      <div><span>备考阶段</span><strong>{plan.phase === 'foundation' ? '基础补强' : plan.phase === 'breakthrough' ? '题型突破' : '冲刺模拟'}</strong><small>系统按进度自动调整</small></div>
      <div><span>今日投入</span><strong>{plannedMinutes} 分钟</strong><small>{plan.tasks.length} 项学习路线</small></div>
      <div><span>今日进度</span><strong>{completedToday}/{plan.tasks.length}</strong><i aria-hidden="true"><b style={{ width: `${completionPercent}%` }} /></i></div>
      <div><span>目标分数</span><strong>425+</strong><small>建议安全目标 450</small></div>
    </section>
    {snapshot && !snapshot.settings.diagnosticCompletedAt && <aside className="cloud-notice"><strong>先做 10～15 分钟基础诊断</strong><p>系统会据此安排第一周学习重点；也可以稍后再做。</p><a href={appHref('diagnostic')}>开始基础诊断</a></aside>}
    {snapshot?.settings.diagnosticProfile && <aside className="diagnostic-summary" aria-labelledby="diagnostic-summary-title"><div><span id="diagnostic-summary-title">基础诊断参考估分</span><strong>预计 {snapshot.settings.diagnosticProfile.estimatedScore} 分</strong><small>参考区间 {snapshot.settings.diagnosticProfile.scoreRange.low}～{snapshot.settings.diagnosticProfile.scoreRange.high}</small><small>初步可信度 · {snapshot.settings.diagnosticProfile.questionCount} 道诊断题</small></div><div><b>{snapshot.settings.diagnosticProfile.estimatedScore >= 425 ? '训练估分位于 425 参考线以上，仍需完整模考验证' : `按训练估算，距 425 参考线约 ${425 - snapshot.settings.diagnosticProfile.estimatedScore} 分`}</b><span>当前优先补强：{priorities.length ? priorities.map((item) => priorityLabels[item.kind]).join('、') : snapshot.settings.diagnosticProfile.weakSkills.map((kind) => priorityLabels[kind]).join('、')}</span><small>估分用于学习规划，不是官方成绩或人工阅卷结果。</small></div><a href={appHref('diagnostic')}>重新诊断</a></aside>}
    {diagnosticRetestDue && <aside className="cloud-notice"><strong>建议重新做一次基础诊断</strong><p>{diagnosticAgeDays >= 21 ? '诊断结果已超过 21 天，' : `诊断后已完成 ${attemptsSinceDiagnostic} 次练习，`}重新测试能让今日弱项安排更准确。</p><a href={appHref('diagnostic')}>开始重新诊断</a></aside>}
    <section className="dashboard-hero"><div className="focus-card"><span className="focus-kicker">TODAY'S PRIORITY · 今日重点</span><h2>{vocabularyWorkload?.reviewOnlyDay ? '今天不学新词，集中巩固前两天内容' : focusKind ? `优先加强${taskCopy[focusKind].title}` : '先建立学习记录，再定位薄弱项'}</h2><p>高频词与重点搭配在同一流程学习和检测，通过后再解锁“{dailyCulturePrompt.theme}”中国文化中译英；翻译任务仍单独完成。</p>{vocabularyWorkload && <div className="vocabulary-workload" aria-label="今日词汇安排"><b>{vocabularyWorkload.reviewOnlyDay ? '两学一复习 · 今日集中巩固' : `今日新词 ${vocabularySession ? `${learnedVocabularyCount}/${dailyVocabularyCount}` : dailyVocabularyCount} 个`}</b><b>旧词巩固 {vocabularyWorkload.dueWords.length} 个</b>{collocationWorkload && <b>{vocabularyWorkload.reviewOnlyDay ? `搭配巩固 ${collocationWorkload.reviewEntries.length} 个` : `新搭配 ${collocationWorkload.newEntries.length} 个`}</b>}{vocabularySession?.phase === 'testing' && <b>正在严格检测同一批单词</b>}{vocabularyWorkload.cultureWords.length > 0 && <b>翻译强化词 {vocabularyWorkload.cultureWords.length} 个</b>}{vocabularyWorkload.reviewBacklog > 0 && <span className="pace-warning" role="alert">另有 {vocabularyWorkload.reviewBacklog} 个到期旧词将在后续巩固日继续处理。</span>}<span>{vocabularyWorkload.remainingWords === 0 ? `${learningVocabulary.length} 个高频词已进入巩固复习` : `还剩 ${vocabularyWorkload.remainingWords} 个高频词`}</span>{collocationWorkload && <span>还剩 {collocationWorkload.remaining} 个重点搭配未首轮学习</span>}{vocabularyWorkload.remainingWords > 0 && vocabularyWorkload.newWordQuota > 0 && <span>目标 {vocabularyWorkload.firstPassTargetDate} 前完成首轮，预留 {vocabularyWorkload.consolidationDays} 天复习巩固</span>}<span>预计 {vocabularyWorkload.projectedMasteryDate} 前完成稳定掌握</span><small>配额会按距考试时间和复习积压自动调整 · 425 参考线 · 450 安全目标</small>{vocabularyWorkload.atRisk && <p className="pace-warning" role="alert">当前进度偏慢：新词日每天至少 {vocabularyWorkload.requiredDailyWords} 个，请适当增加学习时间。</p>}{vocabularyWorkload.masteryAtRisk && <p className="pace-warning" role="alert">按当前学习时长无法在考试前完成稳定掌握。建议增加每日学习时间，并优先清理到期复习。</p>}</div>}<div className="focus-actions"><a className="focus-action" href={appHref('practice/vocabulary')}>{vocabularyAction}</a><a className="knowledge-action" href={appHref('knowledge')}>查看高频知识</a></div></div><aside className="countdown-card"><span className="countdown-label">备考状态</span><div className="countdown-ring" style={{ '--countdown-progress': `${Math.max(10, Math.min(100, 100 - daysUntil(today, targetDate)))}%` } as CSSProperties}><strong>{daysUntil(today, targetDate)}</strong><b>天</b></div><h2>备考状态</h2><h3>{plan.phase === 'foundation' ? '基础补强期' : plan.phase === 'breakthrough' ? '题型突破期' : '冲刺模拟期'}</h3><p>今日完成 {completionPercent}%</p><div className="countdown-meter"><i style={{ width: `${completionPercent}%` }} /></div></aside></section>
    {snapshot && <ExamDateConfirmation settings={snapshot.settings} repository={repository} onConfirmed={(settings) => setSnapshot((current) => current ? { ...current, settings } : current)} />}
    {weeklyReport && <WeeklyLearningReport report={weeklyReport} />}
    <section className="dashboard-grid"><div className="task-panel"><header className="task-panel-heading"><div><span>PERSONAL ROUTE</span><h2>今日学习路线</h2><p>{plannedMinutes > dailyMinutes ? `整套模考 · ${plannedMinutes} 分钟` : `${dailyMinutes} 分钟 · 按顺序完成效果更稳`}</p></div><b>{completedToday}/{plan.tasks.length}</b></header><div className="learning-route">{plan.tasks.map((task, index) => {
      const copy = taskCopy[task.kind];
      const detail = task.kind === 'vocabulary' && vocabularyWorkload ? (vocabularyWorkload.reviewOnlyDay ? `${vocabularyWorkload.dueWords.length} 个旧词 + ${collocationWorkload?.reviewEntries.length ?? 0} 个搭配集中巩固` : `${dailyVocabularyCount} 个新词（已学 ${learnedVocabularyCount} 个）+ ${collocationWorkload?.newEntries.length ?? 0} 个新搭配 + ${vocabularyWorkload.dueWords.length} 个旧词`) : copy.detail;
      const priority = priorities.find((item) => item.kind === task.kind);
      const completed = metrics.completedTaskIds.has(task.id);
      const mastery = snapshot?.knowledgeStates.find((item) => item.itemId === task.id)?.status;
      const locked = task.kind === 'culture' && !vocabularyCompleted;
      const status = locked ? '待解锁' : mastery === 'mastered' ? '已掌握' : mastery === 'review' ? '需要复习' : completed ? '待检测' : '未完成';
      const carried = !task.id.startsWith(`${today}:`);
      return <article key={task.id} className={`task-card ${mastery ?? (completed ? 'completed' : '')}`}><span className="route-index">{String(index + 1).padStart(2, '0')}</span><span className="task-icon">{copy.icon}</span><div><h3>{copy.title}</h3><p>{detail}</p>{priority && <small className="adaptation-reason">{priority.source === 'recent' ? `近期表现补强 · 近 14 天 ${priority.attempts} 次，正确率 ${Math.round(priority.level * 100)}%` : `诊断补强 · 正确率 ${Math.round(priority.level * 100)}%`}</small>}{carried && <small>昨日顺延</small>}{locked ? <span>完成高频词后解锁</span> : completed ? <a href={appHref(`mastery/${task.kind}`, `?taskId=${encodeURIComponent(task.id)}`)}>{mastery === 'mastered' ? '再次检测' : '开始掌握检测'}</a> : <a href={appHref(copy.href)}>开始任务</a>}</div><b>{task.minutes} 分钟</b><span className={`task-status ${mastery ?? (completed ? 'pending' : 'idle')}`}>{status}</span></article>;
    })}</div></div><div className="dashboard-side"><ProgressCards metrics={metrics} /><aside className="evidence-card"><span>LEARNING EVIDENCE</span><h3>学习证据自动记录</h3><p>作答、翻译、掌握检测与遗忘回退都会保存，无需手动标记。</p><a href={appHref('review')}>查看错题与复习 →</a></aside><aside className="source-card"><span>CONTENT STANDARD</span><h3>原创仿真训练</h3><p>结构参照四级公开题型；练习内容为原创仿真，不冒充历年官方真题。</p><a href={appHref('knowledge')}>查看内容依据 →</a></aside></div></section>
  </div>;
}
