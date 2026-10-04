import { useEffect, useMemo, useState } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { CachedPlan, VocabularySessionPhase, VocabularySessionProgress } from '../../data/localDb';
import { learningVocabulary } from '../../content/vocabularyLearning';
import type { VocabularyEntry } from '../../domain/content';
import type { DashboardSnapshot } from '../../domain/learning';
import { VocabularyWarmup } from './VocabularyWarmup';
import { StrictVocabularyCheck } from './StrictVocabularyCheckView';
import { applyVocabularyReviewResult, buildVocabularyWorkload, type VocabularyWorkload } from './vocabularySchedule';
import { vocabularyReviewCard } from './wordMastery';
import { cultureTranslationBank } from '../../content/cultureTranslations';
import { selectDailyCultureTranslation, type CultureTranslationPrompt } from '../translation/cultureTranslation';
import { completeDailyTask } from '../mastery/taskProgress';
import { studyDate } from '../../lib/studyDate';
import { buildWordReinforcement } from '../knowledge/wordReinforcement';
import type { StrictVocabularyGrade } from './strictVocabularyCheck';
import { VocabularyRecallExercise } from './VocabularyRecallExercise';
import collocationData from '../../../content/v1/collocations.json';
import { buildCollocationWorkload, type CollocationEntry } from '../collocations/collocationPractice';
import { CollocationCheck } from '../collocations/CollocationCheck';

type Phase = 'loading' | 'review' | VocabularySessionPhase;

export function DailyVocabularySession({ repository, entries = learningVocabulary, collocationEntries = collocationData as CollocationEntry[], today, examDate, culturePrompts, random = Math.random, onComplete }: {
  repository: LearningRepository;
  entries?: VocabularyEntry[];
  collocationEntries?: CollocationEntry[];
  today: string;
  examDate?: string;
  culturePrompts?: CultureTranslationPrompt[];
  random?: () => number;
  onComplete: (entries: VocabularyEntry[]) => void;
}) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [workload, setWorkload] = useState<VocabularyWorkload | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [error, setError] = useState('');
  const [dailyWords, setDailyWords] = useState<VocabularyEntry[]>([]);
  const [warmupWords, setWarmupWords] = useState<VocabularyEntry[]>([]);
  const [learnedWordIds, setLearnedWordIds] = useState<string[]>([]);
  const [strictPassedWordIds, setStrictPassedWordIds] = useState<string[]>([]);
  const [dailyCollocations, setDailyCollocations] = useState<CollocationEntry[]>([]);
  const [passedCollocationIds, setPassedCollocationIds] = useState<string[]>([]);
  const [cachedPlan, setCachedPlan] = useState<CachedPlan | null>(null);
  const dailyCulturePrompt = selectDailyCultureTranslation(culturePrompts ?? cultureTranslationBank, today);

  useEffect(() => {
    let active = true;
    void Promise.all([
      repository.getDashboardSnapshot(),
      typeof repository.getPlan === 'function' ? repository.getPlan(today).catch(() => null) : Promise.resolve(null),
    ]).then(async ([value, savedPlan]) => {
      if (!active) return;
      let effectivePlan = savedPlan;
      const legacyPhase = savedPlan?.vocabularySession?.phase;
      if (legacyPhase && ['culture-review', 'culture-translation'].includes(legacyPhase)) {
        const taskId = `${today}:vocabulary`;
        const now = new Date().toISOString();
        if (!value.completions.some((item) => item.taskId === taskId)) {
          await completeDailyTask(repository, 'vocabulary', today);
          await repository.upsertKnowledgeState({ id: `mastery:${taskId}`, itemId: taskId, status: 'mastered', favorite: false, updatedAt: now });
        }
        if (typeof repository.savePlan === 'function') {
          effectivePlan = {
            ...savedPlan,
            vocabularySession: { ...savedPlan.vocabularySession!, phase: 'complete' },
            updatedAt: now,
          };
          await repository.savePlan(effectivePlan);
        }
      }
      if (!active) return;
      const next = buildVocabularyWorkload(entries, value.knowledgeStates ?? [], today, examDate ?? value.settings?.examDate ?? '2026-12-12', value.settings?.dailyMinutes ?? 60, {
        cultureWordIds: dailyCulturePrompt.targetWordIds,
        completedVocabularySessions: (value.completions ?? []).filter((item) => item.kind === 'vocabulary').length,
      });
      const nextCollocations = buildCollocationWorkload(collocationEntries, value.knowledgeStates ?? [], today, examDate ?? value.settings?.examDate ?? '2026-12-12', next.reviewOnlyDay);
      const byId = new Map(entries.map((word) => [word.id, word]));
      const collocationById = new Map(collocationEntries.map((item) => [item.id, item]));
      const recoveredWords = entries.filter((word) => {
        const state = value.knowledgeStates.find((item) => item.itemId === word.id);
        return state?.status === 'learning' && studyDate(new Date(state.updatedAt)) === today;
      });
      const session = effectivePlan?.vocabularySession;
      const savedWords = session?.wordIds.map((id) => byId.get(id)).filter((word): word is VocabularyEntry => Boolean(word));
      const cohort = savedWords ?? (recoveredWords.length ? recoveredWords : next.newWords);
      const savedCollocations = session?.collocationIds?.map((id) => collocationById.get(id)).filter((item): item is CollocationEntry => Boolean(item));
      const collocationCohort = savedCollocations ?? nextCollocations.entries;
      const learned = session?.learnedWordIds ?? (recoveredWords.length ? recoveredWords.map((word) => word.id) : []);
      let resumedPhase: Phase = session?.phase ?? (recoveredWords.length ? 'testing' : 'learning');
      if (['culture-review', 'culture-translation'].includes(resumedPhase)) resumedPhase = 'complete';
      setSnapshot(value);
      setWorkload(next);
      setCachedPlan(effectivePlan);
      setDailyWords(cohort);
      setWarmupWords(cohort.filter((word) => !learned.includes(word.id)));
      setLearnedWordIds(learned);
      setStrictPassedWordIds(session?.strictPassedWordIds ?? []);
      setDailyCollocations(collocationCohort);
      setPassedCollocationIds(session?.passedCollocationIds ?? []);
      setPhase(session ? resumedPhase : (next.dueWords.length || next.cultureWords.length) ? 'review' : resumedPhase);
      if (!session && cohort.length && typeof repository.savePlan === 'function') {
        const created: CachedPlan = {
          ...(effectivePlan ?? { id: `plan:${today}`, date: today, tasks: [] }),
          vocabularySession: { wordIds: cohort.map((word) => word.id), collocationIds: collocationCohort.map((item) => item.id), learnedWordIds: learned, phase: recoveredWords.length ? 'testing' : 'learning' },
          updatedAt: new Date().toISOString(),
        };
        await repository.savePlan(created);
        if (active) setCachedPlan(created);
      }
      if (session?.phase === 'complete') onComplete(cohort);
    }).catch(() => { if (active) setError('今日词汇计划读取失败，请刷新后重试。'); });
    return () => { active = false; };
  }, [collocationEntries, dailyCulturePrompt.targetWordIds, entries, examDate, onComplete, repository, today]);

  const reviewWords = useMemo(() => workload ? [...workload.dueWords, ...workload.cultureWords] : [], [workload]);
  const reviewWord = reviewWords[reviewIndex];
  const reviewState = snapshot?.knowledgeStates.find((item) => item.itemId === reviewWord?.id);
  const reviewExercise = useMemo(() => reviewWord ? buildWordReinforcement(reviewWord, random) : null, [random, reviewWord]);

  async function persistSession(phaseValue: VocabularySessionPhase, learnedIds = learnedWordIds, patch: Partial<VocabularySessionProgress> = {}) {
    const storedPlan = typeof repository.getPlan === 'function' ? await repository.getPlan(today) : null;
    const basePlan = storedPlan ?? cachedPlan ?? { id: `plan:${today}`, date: today, tasks: [], updatedAt: new Date().toISOString() };
    if (typeof repository.savePlan !== 'function') return;
    const vocabularySession: VocabularySessionProgress = {
      ...basePlan.vocabularySession,
      wordIds: dailyWords.map((word) => word.id), collocationIds: dailyCollocations.map((item) => item.id), learnedWordIds: learnedIds, phase: phaseValue, ...patch,
    };
    const nextPlan = { ...basePlan, vocabularySession, updatedAt: new Date().toISOString() };
    await repository.savePlan(nextPlan);
    setCachedPlan(nextPlan);
  }

  async function submitReview(grade: StrictVocabularyGrade) {
    if (!reviewWord || !reviewState) return;
    const now = new Date().toISOString();
    await repository.upsertKnowledgeState(applyVocabularyReviewResult(reviewState, grade.correct, now));
    if (!grade.spellingCorrect) await repository.upsertReviewCard(vocabularyReviewCard(reviewWord.id, 'cloze', now));
    if (grade.missingMeanings.length || grade.unexpectedMeanings.length) await repository.upsertReviewCard(vocabularyReviewCard(reviewWord.id, 'meaning', now));
    if (reviewIndex < reviewWords.length - 1) setReviewIndex((value) => value + 1);
    else setPhase('learning');
  }

  async function completeVocabulary() {
    const now = new Date().toISOString();
    setError('');
    try {
      const taskId = await completeDailyTask(repository, 'vocabulary', today);
      await completeDailyTask(repository, 'collocation', today);
      await repository.upsertKnowledgeState({ id: `mastery:${taskId}`, itemId: taskId, status: 'mastered', favorite: false, updatedAt: now });
      await persistSession('complete');
      setPhase('complete');
      onComplete(dailyWords);
    } catch {
      setError('词汇完成状态保存失败，请重试。');
    }
  }

  async function beginCollocations() {
    if (!dailyCollocations.length) { await completeVocabulary(); return; }
    await persistSession('collocations');
    setPhase('collocations');
  }

  if (phase === 'loading') return <p role={error ? 'alert' : 'status'}>{error || '正在准备今日词汇计划…'}</p>;
  if (!workload || !snapshot) return <p role="alert">今日词汇计划暂不可用。</p>;

  if (phase === 'review' && reviewWord && reviewExercise) return <section className="daily-word-review">
    <header><span>旧词与翻译目标词复习 · {reviewIndex + 1}/{reviewWords.length}</span><h1>先复习今天要用的单词</h1><p>题型与挖空位置会随机变化；只有答错、拼写错误或漏译才进入错题复习。</p></header>
    <VocabularyRecallExercise key={`${reviewWord.id}:${reviewIndex}`} exercise={reviewExercise} onSubmit={({ grade }) => submitReview(grade)} onForgotten={submitReview} />
  </section>;

  if (phase === 'learning') {
    if (!dailyWords.length) return <section className="vocabulary-warmup complete"><h1>{workload.reviewOnlyDay ? '今日是集中巩固日' : '今日没有新词'}</h1><p>旧词复习已经完成，接着巩固重点搭配。</p>{error && <p role="alert">{error}</p>}<button className="primary-action" onClick={() => void beginCollocations()}>{dailyCollocations.length ? '继续重点搭配' : '完成今日词汇学习'}</button></section>;
    if (!warmupWords.length) return <StrictVocabularyCheck repository={repository} words={dailyWords} states={snapshot.knowledgeStates} passedWordIds={strictPassedWordIds} onWordPassed={async (wordId) => {
      const passed = [...new Set([...strictPassedWordIds, wordId])];
      await persistSession('testing', learnedWordIds, { strictPassedWordIds: passed });
      setStrictPassedWordIds(passed);
    }} onComplete={() => void beginCollocations()} />;
    return <VocabularyWarmup repository={repository} entries={warmupWords} limit={warmupWords.length} onWordLearned={async (wordId) => {
      const nextLearned = [...new Set([...learnedWordIds, wordId])];
      await persistSession(nextLearned.length === dailyWords.length ? 'testing' : 'learning', nextLearned);
      setLearnedWordIds(nextLearned);
    }} onComplete={() => setPhase('testing')} />;
  }

  if (phase === 'testing') return <StrictVocabularyCheck repository={repository} words={dailyWords} states={snapshot.knowledgeStates} passedWordIds={strictPassedWordIds} onWordPassed={async (wordId) => {
    const passed = [...new Set([...strictPassedWordIds, wordId])];
    await persistSession('testing', learnedWordIds, { strictPassedWordIds: passed });
    setStrictPassedWordIds(passed);
  }} onComplete={() => void beginCollocations()} />;
  if (phase === 'collocations') return <CollocationCheck repository={repository} entries={dailyCollocations} states={snapshot.knowledgeStates} passedItemIds={passedCollocationIds} random={random} onItemPassed={async (itemId) => {
    const passed = [...new Set([...passedCollocationIds, itemId])];
    await persistSession('collocations', learnedWordIds, { passedCollocationIds: passed });
    setPassedCollocationIds(passed);
  }} onComplete={() => void completeVocabulary()} />;
  if (phase === 'complete') return <section className="practice-summary"><h1>今日词汇与搭配训练已完成</h1><p>同一批高频词与重点搭配已经完成主动回忆检测，错误记录已进入错题复习。</p></section>;
  return <p role="alert">今日词汇训练状态无法识别，请返回今日学习重试。</p>;
}
