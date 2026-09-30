import { useEffect, useState } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { CachedPlan, VocabularySessionPhase, VocabularySessionProgress } from '../../data/localDb';
import { learningVocabulary } from '../../content/vocabularyLearning';
import type { VocabularyEntry } from '../../domain/content';
import type { DashboardSnapshot } from '../../domain/learning';
import { VocabularyWarmup } from './VocabularyWarmup';
import { StrictVocabularyCheck } from './StrictVocabularyCheckView';
import { applyVocabularyReviewResult, buildVocabularyWorkload, buildWordCloze, type VocabularyWorkload } from './vocabularySchedule';
import { vocabularyReviewCard } from './wordMastery';
import collocationData from '../../../content/v1/collocations.json';
import { CollocationCheck } from '../collocations/CollocationCheck';
import { selectDailyCollocations, type CollocationEntry } from '../collocations/collocationPractice';
import { cultureTranslationBank } from '../../content/cultureTranslations';
import { DailyCultureTranslation } from '../translation/DailyCultureTranslation';
import { selectDailyCultureTranslation, type CultureTranslationPrompt } from '../translation/cultureTranslation';
import { completeDailyTask } from '../mastery/taskProgress';
import { studyDate } from '../../lib/studyDate';

type Phase = 'loading' | 'review' | VocabularySessionPhase;

export function DailyVocabularySession({ repository, entries = learningVocabulary, today, examDate, culturePrompts, onComplete }: {
  repository: LearningRepository;
  entries?: VocabularyEntry[];
  today: string;
  examDate?: string;
  culturePrompts?: CultureTranslationPrompt[];
  onComplete: (entries: VocabularyEntry[]) => void;
}) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [workload, setWorkload] = useState<VocabularyWorkload | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dailyWords, setDailyWords] = useState<VocabularyEntry[]>([]);
  const [warmupWords, setWarmupWords] = useState<VocabularyEntry[]>([]);
  const [learnedWordIds, setLearnedWordIds] = useState<string[]>([]);
  const [strictPassedWordIds, setStrictPassedWordIds] = useState<string[]>([]);
  const [cultureDraft, setCultureDraft] = useState('');
  const [passedCultureReviewWordIds, setPassedCultureReviewWordIds] = useState<string[]>([]);
  const [reviewedCultureWordIds, setReviewedCultureWordIds] = useState<string[]>([]);
  const [culturePassed, setCulturePassed] = useState(false);
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
      const next = buildVocabularyWorkload(entries, value.knowledgeStates ?? [], today, examDate ?? value.settings?.examDate ?? '2026-12-12', value.settings?.dailyMinutes ?? 60, { cultureWordIds: dailyCulturePrompt.targetWordIds });
      const byId = new Map(entries.map((word) => [word.id, word]));
      const recoveredWords = entries.filter((word) => {
        const state = value.knowledgeStates.find((item) => item.itemId === word.id);
        return state?.status === 'learning' && studyDate(new Date(state.updatedAt)) === today;
      });
      const session = savedPlan?.vocabularySession;
      const savedWords = session?.wordIds.map((id) => byId.get(id)).filter((word): word is VocabularyEntry => Boolean(word));
      const cohort = savedWords ?? (recoveredWords.length ? recoveredWords : next.newWords);
      const learned = session?.learnedWordIds ?? (recoveredWords.length ? recoveredWords.map((word) => word.id) : []);
      const reviewedCulture = [...new Set([...(session?.reviewedCultureWordIds ?? []), ...(session?.passedCultureReviewWordIds ?? [])])];
      let resumedPhase: Phase = session?.phase ?? (recoveredWords.length ? 'testing' : 'learning');
      if (resumedPhase === 'culture-review' && next.cultureWords.every((word) => reviewedCulture.includes(word.id))) resumedPhase = 'culture-translation';
      if (resumedPhase === 'culture-translation' && session?.culturePassed) resumedPhase = 'collocations';
      setSnapshot(value);
      setWorkload(next);
      setCachedPlan(savedPlan);
      setDailyWords(cohort);
      setWarmupWords(cohort.filter((word) => !learned.includes(word.id)));
      setLearnedWordIds(learned);
      setStrictPassedWordIds(session?.strictPassedWordIds ?? []);
      setPassedCultureReviewWordIds(session?.passedCultureReviewWordIds ?? []);
      setReviewedCultureWordIds(reviewedCulture);
      setCultureDraft(session?.cultureDraft ?? '');
      setCulturePassed(session?.culturePassed ?? false);
      setPassedCollocationIds(session?.passedCollocationIds ?? []);
      setPhase(session ? resumedPhase : next.dueWords.length ? 'review' : resumedPhase);
      if (!session && cohort.length && typeof repository.savePlan === 'function') {
        const created: CachedPlan = {
          ...(savedPlan ?? { id: `plan:${today}`, date: today, tasks: [] }),
          vocabularySession: { wordIds: cohort.map((word) => word.id), learnedWordIds: learned, phase: recoveredWords.length ? 'testing' : 'learning' },
          updatedAt: new Date().toISOString(),
        };
        await repository.savePlan(created);
        if (active) setCachedPlan(created);
      }
      if (session?.phase === 'complete') onComplete(cohort);
    }).catch(() => { if (active) setError('今日词汇计划读取失败，请刷新后重试。'); });
    return () => { active = false; };
  }, [dailyCulturePrompt.targetWordIds, entries, examDate, onComplete, repository, today]);

  const reviewWord = workload?.dueWords[reviewIndex];
  const reviewState = snapshot?.knowledgeStates.find((item) => item.itemId === reviewWord?.id);
  const dailyCollocations = selectDailyCollocations(collocationData as CollocationEntry[], snapshot?.knowledgeStates ?? [], `${today}T23:59:59.999Z`, 3);

  async function persistSession(phaseValue: VocabularySessionPhase, learnedIds = learnedWordIds, patch: Partial<VocabularySessionProgress> = {}) {
    const storedPlan = typeof repository.getPlan === 'function' ? await repository.getPlan(today) : null;
    const basePlan = storedPlan ?? cachedPlan ?? { id: `plan:${today}`, date: today, tasks: [], updatedAt: new Date().toISOString() };
    if (typeof repository.savePlan !== 'function') return;
    const vocabularySession: VocabularySessionProgress = {
      ...basePlan.vocabularySession,
      wordIds: dailyWords.map((word) => word.id), learnedWordIds: learnedIds, phase: phaseValue, ...patch,
    };
    const nextPlan = { ...basePlan, vocabularySession, updatedAt: new Date().toISOString() };
    await repository.savePlan(nextPlan);
    setCachedPlan(nextPlan);
  }

  async function moveTo(nextPhase: VocabularySessionPhase) {
    setError('');
    try {
      await persistSession(nextPhase);
      setPhase(nextPhase);
    } catch {
      setError('学习进度保存失败，请重试。');
    }
  }

  async function submitReview(forceIncorrect = false) {
    if (!reviewWord || !reviewState || (!answer.trim() && !forceIncorrect) || saving) return;
    const now = new Date().toISOString();
    const correct = !forceIncorrect && answer.trim().toLowerCase() === reviewWord.word.toLowerCase();
    const nextState = applyVocabularyReviewResult(reviewState, correct, now);
    setSaving(true); setError('');
    try {
      await repository.upsertKnowledgeState(nextState);
      if (!correct) await repository.upsertReviewCard(vocabularyReviewCard(reviewWord.id, 'cloze', now));
      if (workload && reviewIndex < workload.dueWords.length - 1) setReviewIndex((value) => value + 1);
      else setPhase('learning');
      setAnswer('');
    } catch {
      setError('旧词复习结果保存失败，答案已保留，请重新提交。');
    } finally {
      setSaving(false);
    }
  }

  const cultureReviewWord = workload?.cultureWords.find((word) => !reviewedCultureWordIds.includes(word.id));
  const cultureReviewPosition = cultureReviewWord ? workload?.cultureWords.findIndex((word) => word.id === cultureReviewWord.id) ?? 0 : workload?.cultureWords.length ?? 0;
  const cultureReviewState = snapshot?.knowledgeStates.find((item) => item.itemId === cultureReviewWord?.id);

  async function submitCultureReview(forceIncorrect = false) {
    if (!cultureReviewWord || !cultureReviewState || (!answer.trim() && !forceIncorrect) || saving) return;
    const now = new Date().toISOString();
    const correct = !forceIncorrect && answer.trim().toLowerCase() === cultureReviewWord.word.toLowerCase();
    setSaving(true); setError('');
    try {
      await repository.upsertKnowledgeState(applyVocabularyReviewResult(cultureReviewState, correct, now));
      if (!correct) await repository.upsertReviewCard(vocabularyReviewCard(cultureReviewWord.id, 'cloze', now));
      const reviewed = [...new Set([...reviewedCultureWordIds, cultureReviewWord.id])];
      const passed = correct ? [...new Set([...passedCultureReviewWordIds, cultureReviewWord.id])] : passedCultureReviewWordIds;
      await persistSession(reviewed.length >= (workload?.cultureWords.length ?? 0) ? 'culture-translation' : 'culture-review', learnedWordIds, { reviewedCultureWordIds: reviewed, passedCultureReviewWordIds: passed });
      setReviewedCultureWordIds(reviewed);
      setPassedCultureReviewWordIds(passed);
      if (reviewed.length >= (workload?.cultureWords.length ?? 0)) setPhase('culture-translation');
      setAnswer('');
    } catch {
      setError('翻译强化词结果保存失败，答案已保留，请重新提交。');
    } finally {
      setSaving(false);
    }
  }

  if (phase === 'loading') return <p role={error ? 'alert' : 'status'}>{error || '正在准备今日词汇计划…'}</p>;
  if (!workload || !snapshot) return <p role="alert">今日词汇计划暂不可用。</p>;

  if (phase === 'review' && reviewWord) return <section className="daily-word-review">
    <header><span>旧词复习 · {reviewIndex + 1}/{workload.dueWords.length}</span><h1>先复习旧词</h1><p>补全单词；忘记的词会自动加入错题复习。</p></header>
    <article className="warmup-card"><h2>{buildWordCloze(reviewWord.word, reviewState?.reviewStage ?? 0)}</h2><p>{reviewWord.meaningZh}</p><label>补全单词<input aria-label="补全单词" autoComplete="off" value={answer} onChange={(event) => setAnswer(event.target.value)} /></label>{error && <p role="alert">{error}</p>}<div><button disabled={saving} onClick={() => void submitReview(true)}>想不起来，加入错题</button><button className="primary-action" disabled={!answer.trim() || saving} onClick={() => void submitReview()}>{saving ? '正在保存…' : '提交旧词复习'}</button></div></article>
  </section>;

  if (phase === 'learning') {
    const nextPhase = workload.cultureWords.length ? 'culture-review' : 'culture-translation';
    if (!dailyWords.length) return <section className="vocabulary-warmup complete"><h1>今日没有新词</h1><p>先检测今天的翻译强化词，再完成中国文化翻译。</p>{error && <p role="alert">{error}</p>}<button className="primary-action" onClick={() => void moveTo(nextPhase)}>{workload.cultureWords.length ? '开始翻译强化词检测' : '开始今日文化翻译'}</button></section>;
    if (!warmupWords.length) return <StrictVocabularyCheck repository={repository} words={dailyWords} states={snapshot.knowledgeStates} passedWordIds={strictPassedWordIds} onWordPassed={async (wordId) => {
      const passed = [...new Set([...strictPassedWordIds, wordId])];
      await persistSession('testing', learnedWordIds, { strictPassedWordIds: passed });
      setStrictPassedWordIds(passed);
    }} onComplete={() => moveTo(workload.cultureWords.length ? 'culture-review' : 'culture-translation')} />;
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
  }} onComplete={() => moveTo(workload.cultureWords.length ? 'culture-review' : 'culture-translation')} />;

  if (phase === 'culture-review' && cultureReviewWord) return <section className="daily-word-review">
    <header><span>翻译强化词 · {cultureReviewPosition + 1}/{workload.cultureWords.length}</span><h1>先检测翻译强化词</h1><p>根据中文补全英文；答错会自动回到待复习。</p></header>
    <article className="warmup-card"><h2>{buildWordCloze(cultureReviewWord.word, cultureReviewState?.reviewStage ?? 0)}</h2><p>{cultureReviewWord.meaningZh}</p><label>补全强化词<input aria-label="补全强化词" autoComplete="off" value={answer} onChange={(event) => setAnswer(event.target.value)} /></label>{error && <p role="alert">{error}</p>}<div><button disabled={saving} onClick={() => void submitCultureReview(true)}>想不起来，加入错题</button><button className="primary-action" disabled={!answer.trim() || saving} onClick={() => void submitCultureReview()}>{saving ? '正在保存…' : '提交强化词检测'}</button></div></article>
  </section>;

  async function saveCultureDraft(value: string) {
    setCultureDraft(value);
    await persistSession('culture-translation', learnedWordIds, { cultureDraft: value, culturePassed });
  }

  if (phase === 'culture-translation') return <DailyCultureTranslation repository={repository} prompt={dailyCulturePrompt} vocabulary={entries} states={snapshot.knowledgeStates} date={today} initialAnswer={cultureDraft} onDraftChange={saveCultureDraft} onPassed={async (passedAnswer) => {
    await persistSession('culture-translation', learnedWordIds, { cultureDraft: passedAnswer, culturePassed: true });
    setCultureDraft(passedAnswer);
    setCulturePassed(true);
  }} onComplete={() => void moveTo('collocations')} />;
  if (phase === 'complete') return <section className="practice-summary"><h1>今日词汇训练已完成</h1><p>同一批新词已学习并通过严格检测，错误记录已进入错题复习。</p></section>;

  return <CollocationCheck repository={repository} entries={dailyCollocations} passedItemIds={passedCollocationIds} allEntries={collocationData as CollocationEntry[]} states={snapshot.knowledgeStates} onItemPassed={async (itemId) => {
    const passed = [...new Set([...passedCollocationIds, itemId])];
    await persistSession('collocations', learnedWordIds, { passedCollocationIds: passed });
    setPassedCollocationIds(passed);
  }} onComplete={async () => {
    const now = new Date().toISOString();
    const taskId = await completeDailyTask(repository, 'vocabulary', today);
    await repository.upsertKnowledgeState({ id: `mastery:${taskId}`, itemId: taskId, status: 'mastered', favorite: false, updatedAt: now });
    await persistSession('complete');
    setPhase('complete');
    onComplete(dailyWords);
  }} />;
}
