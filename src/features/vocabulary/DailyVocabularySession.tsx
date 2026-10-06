import { useEffect, useMemo, useState } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { CachedPlan, VocabularySessionPhase, VocabularySessionProgress } from '../../data/localDb';
import { learningVocabulary } from '../../content/vocabularyLearning';
import type { VocabularyEntry, VocabularyLayer } from '../../domain/content';
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
import { enrichmentFor } from '../../content/vocabularyEnrichment';
import { EnrichmentRecallExercise } from './EnrichmentRecallExercise';

type Phase = 'loading' | 'review' | VocabularySessionPhase;

export function DailyVocabularySession({ repository, entries = learningVocabulary, collocationEntries = collocationData as CollocationEntry[], layer = 'core', today, examDate, culturePrompts, random = Math.random, onComplete }: {
  repository: LearningRepository;
  entries?: VocabularyEntry[];
  collocationEntries?: CollocationEntry[];
  layer?: VocabularyLayer;
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
  const [checkedEnrichmentWordIds, setCheckedEnrichmentWordIds] = useState<string[]>([]);
  const [cachedPlan, setCachedPlan] = useState<CachedPlan | null>(null);
  const dailyCulturePrompt = selectDailyCultureTranslation(culturePrompts ?? cultureTranslationBank, today);
  const sessionProperty = layer === 'foundation' ? 'foundationVocabularySession' : 'vocabularySession';
  const taskId = `${today}:${layer === 'foundation' ? 'foundation-vocabulary' : 'vocabulary'}`;

  useEffect(() => {
    let active = true;
    void Promise.all([
      repository.getDashboardSnapshot(),
      typeof repository.getPlan === 'function' ? repository.getPlan(today).catch(() => null) : Promise.resolve(null),
    ]).then(async ([value, savedPlan]) => {
      if (!active) return;
      let effectivePlan = savedPlan;
      const savedSession = savedPlan?.[sessionProperty];
      const legacyPhase = layer === 'core' ? savedSession?.phase : undefined;
      if (legacyPhase && ['culture-review', 'culture-translation'].includes(legacyPhase)) {
        const now = new Date().toISOString();
        if (!value.completions.some((item) => item.taskId === taskId)) {
          await completeDailyTask(repository, 'vocabulary', today);
          await repository.upsertKnowledgeState({ id: `mastery:${taskId}`, itemId: taskId, status: 'mastered', favorite: false, updatedAt: now });
        }
        if (typeof repository.savePlan === 'function') {
          const migratedPlan: CachedPlan = {
            ...savedPlan!,
            [sessionProperty]: { ...savedSession!, phase: 'complete' },
            updatedAt: now,
          };
          effectivePlan = migratedPlan;
          await repository.savePlan(migratedPlan);
        }
      }
      if (!active) return;
      const next = buildVocabularyWorkload(entries, value.knowledgeStates ?? [], today, examDate ?? value.settings?.examDate ?? '2026-12-12', value.settings?.dailyMinutes ?? 60, {
        cultureWordIds: layer === 'core' ? dailyCulturePrompt.targetWordIds : [],
        completedVocabularySessions: (value.completions ?? []).filter((item) => item.taskId.endsWith(layer === 'foundation' ? ':foundation-vocabulary' : ':vocabulary')).length,
        layer,
      });
      const nextCollocations = layer === 'core' ? buildCollocationWorkload(collocationEntries, value.knowledgeStates ?? [], today, examDate ?? value.settings?.examDate ?? '2026-12-12', next.reviewOnlyDay) : { entries: [] };
      const byId = new Map(entries.map((word) => [word.id, word]));
      const collocationById = new Map(collocationEntries.map((item) => [item.id, item]));
      const recoveredWords = entries.filter((word) => {
        const state = value.knowledgeStates.find((item) => item.itemId === word.id);
        return state?.status === 'learning' && studyDate(new Date(state.updatedAt)) === today;
      });
      const session = effectivePlan?.[sessionProperty];
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
      setCheckedEnrichmentWordIds(session?.checkedEnrichmentWordIds ?? []);
      setPhase(session ? resumedPhase : (next.dueWords.length || next.cultureWords.length) ? 'review' : resumedPhase);
      if (!session && cohort.length && typeof repository.savePlan === 'function') {
        const created: CachedPlan = {
          ...(effectivePlan ?? { id: `plan:${today}`, date: today, tasks: [] }),
          [sessionProperty]: { wordIds: cohort.map((word) => word.id), collocationIds: collocationCohort.map((item) => item.id), learnedWordIds: learned, phase: recoveredWords.length ? 'testing' : 'learning' },
          updatedAt: new Date().toISOString(),
        };
        await repository.savePlan(created);
        if (active) setCachedPlan(created);
      }
      if (session?.phase === 'complete') onComplete(cohort);
    }).catch(() => { if (active) setError('今日词汇计划读取失败，请刷新后重试。'); });
    return () => { active = false; };
  }, [collocationEntries, dailyCulturePrompt.targetWordIds, entries, examDate, layer, onComplete, repository, sessionProperty, taskId, today]);

  const reviewWords = useMemo(() => workload ? [...workload.dueWords, ...workload.cultureWords] : [], [workload]);
  const reviewWord = reviewWords[reviewIndex];
  const reviewState = snapshot?.knowledgeStates.find((item) => item.itemId === reviewWord?.id);
  const reviewExercise = useMemo(() => reviewWord ? buildWordReinforcement(reviewWord, random) : null, [random, reviewWord]);
  const enrichmentWords = useMemo(() => dailyWords.filter((word) => Boolean(enrichmentFor(word.id))), [dailyWords]);
  const enrichmentWord = enrichmentWords.find((word) => !checkedEnrichmentWordIds.includes(word.id));

  async function persistSession(phaseValue: VocabularySessionPhase, learnedIds = learnedWordIds, patch: Partial<VocabularySessionProgress> = {}) {
    const storedPlan = typeof repository.getPlan === 'function' ? await repository.getPlan(today) : null;
    const basePlan = storedPlan ?? cachedPlan ?? { id: `plan:${today}`, date: today, tasks: [], updatedAt: new Date().toISOString() };
    if (typeof repository.savePlan !== 'function') return;
    const vocabularySession: VocabularySessionProgress = {
      ...basePlan[sessionProperty],
      wordIds: dailyWords.map((word) => word.id), collocationIds: dailyCollocations.map((item) => item.id), learnedWordIds: learnedIds, phase: phaseValue, ...patch,
    };
    const nextPlan = { ...basePlan, [sessionProperty]: vocabularySession, updatedAt: new Date().toISOString() };
    await repository.savePlan(nextPlan);
    setCachedPlan(nextPlan);
  }

  async function submitReview(grade: StrictVocabularyGrade) {
    if (!reviewWord || !reviewState) return;
    const now = new Date().toISOString();
    await repository.upsertKnowledgeState(applyVocabularyReviewResult(reviewState, grade.correct, now));
    if (!grade.spellingCorrect) await repository.upsertReviewCard(vocabularyReviewCard(reviewWord.id, 'cloze', now));
    if (grade.missingMeanings.length) await repository.upsertReviewCard(vocabularyReviewCard(reviewWord.id, 'meaning', now));
    if (reviewIndex < reviewWords.length - 1) setReviewIndex((value) => value + 1);
    else setPhase('learning');
  }

  async function completeVocabulary() {
    const now = new Date().toISOString();
    setError('');
    try {
      await repository.completeTask({ id: taskId, date: today, taskId, kind: 'vocabulary', completedAt: now });
      if (layer === 'core') await completeDailyTask(repository, 'collocation', today);
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

  async function beginEnrichment() {
    if (!enrichmentWords.some((word) => !checkedEnrichmentWordIds.includes(word.id))) { await beginCollocations(); return; }
    await persistSession('enrichment', learnedWordIds, { checkedEnrichmentWordIds });
    setPhase('enrichment');
  }

  async function submitEnrichment(correct: boolean, vocabularyId: string) {
    if (!snapshot) return;
    const now = new Date().toISOString();
    const current = snapshot.knowledgeStates.find((item) => item.itemId === vocabularyId) ?? {
      id: `knowledge:${vocabularyId}`, itemId: vocabularyId, status: 'learning' as const, favorite: false, updatedAt: now,
    };
    await repository.upsertKnowledgeState(applyVocabularyReviewResult(current, correct, now));
    if (!correct) await repository.upsertReviewCard(vocabularyReviewCard(vocabularyId, 'cloze', now));
    const checked = [...new Set([...checkedEnrichmentWordIds, vocabularyId])];
    setCheckedEnrichmentWordIds(checked);
    await persistSession('enrichment', learnedWordIds, { checkedEnrichmentWordIds: checked });
    if (enrichmentWords.every((word) => checked.includes(word.id))) await beginCollocations();
  }

  if (phase === 'loading') return <p role={error ? 'alert' : 'status'}>{error || '正在准备今日词汇计划…'}</p>;
  if (!workload || !snapshot) return <p role="alert">今日词汇计划暂不可用。</p>;

  if (phase === 'review' && reviewWord && reviewExercise) {
    const completedReviews = reviewIndex;
    const remainingReviews = reviewWords.length - reviewIndex;
    const reviewProgress = Math.round((completedReviews / reviewWords.length) * 100);
    return <section className="daily-word-review">
      <header className="daily-review-hero">
        <div><span className="review-eyebrow">RECALL FIRST · 旧词唤醒</span><h1>先复习今天要用的单词</h1><p>不看答案主动回忆；题型与挖空位置会随机变化，答对后继续，答错会重新安排巩固。</p></div>
        <div className="daily-review-counter" aria-label={`第 ${reviewIndex + 1} 题，共 ${reviewWords.length} 题`}><strong>{String(reviewIndex + 1).padStart(2, '0')}</strong><span>/ {String(reviewWords.length).padStart(2, '0')}</span></div>
      </header>
      <section className="daily-review-progress" aria-label="旧词复习概览">
        <div><span>已完成 {completedReviews}</span><span>剩余 {remainingReviews}</span></div>
        <div role="progressbar" aria-label="旧词复习进度" aria-valuemin={0} aria-valuemax={reviewWords.length} aria-valuenow={completedReviews}><i style={{ width: `${reviewProgress}%` }} /></div>
      </section>
      <div className="daily-review-layout">
        <VocabularyRecallExercise key={`${reviewWord.id}:${reviewIndex}`} exercise={reviewExercise} onSubmit={({ grade }) => submitReview(grade)} onForgotten={submitReview} />
        <aside className="daily-review-guide" aria-labelledby="daily-review-guide-title">
          <span>ACTIVE RECALL</span><h2 id="daily-review-guide-title">这一题怎么做</h2>
          <ol><li><b>先独立回想</b><small>只填写当前唯一的空白，不需要猜两项。</small></li><li><b>按记得的意思作答</b><small>中文近义表达可以接受，不必逐字一致。</small></li><li><b>诚实记录遗忘</b><small>答错或想不起来，会自动加入错题复习。</small></li></ol>
          <p>本题不会提前显示目标答案；提交后系统会保存真实掌握情况。</p>
        </aside>
      </div>
    </section>;
  }

  if (phase === 'learning') {
    if (!dailyWords.length) return <section className="vocabulary-warmup complete"><h1>{workload.reviewOnlyDay ? '今日是集中巩固日' : '今日没有新词'}</h1><p>旧词复习已经完成，接着巩固重点搭配。</p>{error && <p role="alert">{error}</p>}<button className="primary-action" onClick={() => void beginCollocations()}>{dailyCollocations.length ? '继续重点搭配' : '完成今日词汇学习'}</button></section>;
    if (!warmupWords.length) return <StrictVocabularyCheck repository={repository} words={dailyWords} knownWords={entries} states={snapshot.knowledgeStates} passedWordIds={strictPassedWordIds} onWordPassed={async (wordId) => {
      const passed = [...new Set([...strictPassedWordIds, wordId])];
      await persistSession('testing', learnedWordIds, { strictPassedWordIds: passed });
      setStrictPassedWordIds(passed);
    }} onComplete={() => void beginEnrichment()} />;
    return <VocabularyWarmup repository={repository} entries={warmupWords} layer={layer} limit={warmupWords.length} onWordLearned={async (wordId) => {
      const nextLearned = [...new Set([...learnedWordIds, wordId])];
      await persistSession(nextLearned.length === dailyWords.length ? 'testing' : 'learning', nextLearned);
      setLearnedWordIds(nextLearned);
    }} onComplete={() => setPhase('testing')} />;
  }

  if (phase === 'testing') return <StrictVocabularyCheck repository={repository} words={dailyWords} knownWords={entries} states={snapshot.knowledgeStates} passedWordIds={strictPassedWordIds} onWordPassed={async (wordId) => {
    const passed = [...new Set([...strictPassedWordIds, wordId])];
    await persistSession('testing', learnedWordIds, { strictPassedWordIds: passed });
    setStrictPassedWordIds(passed);
  }} onComplete={() => void beginEnrichment()} />;
  if (phase === 'enrichment' && enrichmentWord) return <section className="strict-vocabulary-check"><header><span>词族与易混词巩固</span><h1>把新词放进词族中记忆</h1><p>每题只隐藏一个目标；错误只回退当前单词。</p></header><EnrichmentRecallExercise key={enrichmentWord.id} word={enrichmentWord} enrichment={enrichmentFor(enrichmentWord.id)!} random={random} onSubmit={({ correct, vocabularyId }) => submitEnrichment(correct, vocabularyId)} /></section>;
  if (phase === 'collocations') return <CollocationCheck repository={repository} entries={dailyCollocations} states={snapshot.knowledgeStates} passedItemIds={passedCollocationIds} random={random} onItemPassed={async (itemId) => {
    const passed = [...new Set([...passedCollocationIds, itemId])];
    await persistSession('collocations', learnedWordIds, { passedCollocationIds: passed });
    setPassedCollocationIds(passed);
  }} onComplete={() => void completeVocabulary()} />;
  if (phase === 'complete') return <section className="practice-summary"><h1>{layer === 'foundation' ? '今日基础必会词训练已完成' : '今日词汇与搭配训练已完成'}</h1><p>{layer === 'foundation' ? '基础词已经完成主动回忆检测；错误只进入基础必会词错题复习。' : '同一批高频词与重点搭配已经完成主动回忆检测，错误记录已进入错题复习。'}</p></section>;
  return <p role="alert">今日词汇训练状态无法识别，请返回今日学习重试。</p>;
}
