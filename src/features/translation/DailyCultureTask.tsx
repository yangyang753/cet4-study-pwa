import { useEffect, useState } from 'react';
import { cultureTranslationBank } from '../../content/cultureTranslations';
import { learningVocabulary } from '../../content/vocabularyLearning';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { CachedPlan, VocabularySessionProgress } from '../../data/localDb';
import type { VocabularyEntry } from '../../domain/content';
import type { DashboardSnapshot } from '../../domain/learning';
import { appHref } from '../../lib/appHref';
import { studyDate } from '../../lib/studyDate';
import { completeDailyTask } from '../mastery/taskProgress';
import { DailyCultureTranslation } from './DailyCultureTranslation';
import { selectDailyCultureTranslation, type CultureTranslationPrompt } from './cultureTranslation';

const defaultRepository = new DexieLearningRepository();
const vocabularyPassedPhases = new Set(['complete', 'culture-review', 'culture-translation', 'collocations']);

export function DailyCultureTask({ repository = defaultRepository, today = studyDate(), vocabulary = learningVocabulary, prompts = cultureTranslationBank }: {
  repository?: LearningRepository;
  today?: string;
  vocabulary?: VocabularyEntry[];
  prompts?: CultureTranslationPrompt[];
}) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [plan, setPlan] = useState<CachedPlan | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const prompt = selectDailyCultureTranslation(prompts, today);

  useEffect(() => {
    let active = true;
    void Promise.all([repository.getDashboardSnapshot(), repository.getPlan(today)]).then(async ([nextSnapshot, nextPlan]) => {
      if (!active) return;
      const cultureTaskId = `${today}:culture`;
      if (nextPlan?.vocabularySession?.culturePassed && !nextSnapshot.completions.some((item) => item.taskId === cultureTaskId)) {
        await completeDailyTask(repository, 'culture', today);
        await repository.upsertKnowledgeState({ id: `mastery:${cultureTaskId}`, itemId: cultureTaskId, status: 'mastered', favorite: false, updatedAt: new Date().toISOString() });
        if (!active) return;
        setFinished(true);
      }
      setSnapshot(nextSnapshot);
      setPlan(nextPlan);
    }).catch(() => { if (active) setError('文化翻译学习记录读取失败，请刷新后重试。'); });
    return () => { active = false; };
  }, [repository, today]);

  async function updateSession(patch: Partial<VocabularySessionProgress>) {
    const existing = plan?.vocabularySession;
    const vocabularySession: VocabularySessionProgress = existing
      ? { ...existing, ...patch }
      : { wordIds: [], learnedWordIds: [], phase: 'complete', ...patch };
    const nextPlan: CachedPlan = {
      ...(plan ?? { id: `plan:${today}`, date: today, tasks: [] }),
      vocabularySession,
      updatedAt: new Date().toISOString(),
    };
    await repository.savePlan(nextPlan);
    setPlan(nextPlan);
  }

  if (error) return <p role="alert">{error}</p>;
  if (!snapshot || plan === undefined) return <p role="status">正在检查今日高频词学习进度…</p>;
  const session = plan?.vocabularySession;
  const vocabularyTaskId = `${today}:vocabulary`;
  const unlocked = Boolean((session && vocabularyPassedPhases.has(session.phase)) || snapshot.completions.some((item) => item.taskId === vocabularyTaskId));
  const cultureCompleted = snapshot.completions.some((item) => item.taskId === `${today}:culture`);
  if (!unlocked) return <section className="practice-summary locked-task"><h1>先完成今日高频词</h1><p>中国文化中译英是独立任务，但必须先通过今日单词学习与严格检测后才能开始。</p><a className="primary-action" href={appHref('practice/vocabulary')}>返回学习高频词</a></section>;
  if (finished || cultureCompleted || session?.culturePassed) return <section className="practice-summary"><h1>今日中国文化翻译已完成</h1><p>遗漏或误用的目标词已自动进入错题复习。</p><a className="primary-action" href={appHref('today')}>返回今日学习</a></section>;

  return <DailyCultureTranslation
    repository={repository}
    prompt={prompt}
    vocabulary={vocabulary}
    states={snapshot.knowledgeStates}
    date={today}
    initialAnswer={session?.cultureDraft ?? ''}
    completeLabel="完成今日文化翻译"
    onDraftChange={(cultureDraft) => updateSession({ cultureDraft })}
    onPassed={(cultureDraft) => updateSession({ cultureDraft })}
    onComplete={async () => {
      const taskId = await completeDailyTask(repository, 'culture', today);
      await repository.upsertKnowledgeState({ id: `mastery:${taskId}`, itemId: taskId, status: 'mastered', favorite: false, updatedAt: new Date().toISOString() });
      await updateSession({ culturePassed: true });
      setFinished(true);
    }}
  />;
}

export function DailyCultureRoute() {
  return <DailyCultureTask />;
}
