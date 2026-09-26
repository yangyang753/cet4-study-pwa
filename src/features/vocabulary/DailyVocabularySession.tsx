import { useEffect, useState } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { learningVocabulary } from '../../content/vocabularyLearning';
import type { VocabularyEntry } from '../../domain/content';
import type { DashboardSnapshot } from '../../domain/learning';
import { VocabularyWarmup } from './VocabularyWarmup';
import { VocabularyTranslationCheck } from './VocabularyTranslationCheck';
import { applyVocabularyReviewResult, buildVocabularyWorkload, buildWordCloze, type VocabularyWorkload } from './vocabularySchedule';
import { vocabularyReviewCard } from './wordMastery';
import collocationData from '../../../content/v1/collocations.json';
import { CollocationCheck } from '../collocations/CollocationCheck';
import { selectDailyCollocations, type CollocationEntry } from '../collocations/collocationPractice';

type Phase = 'loading' | 'review' | 'warmup' | 'translation' | 'collocations';

export function DailyVocabularySession({ repository, entries = learningVocabulary, today, examDate, onComplete }: {
  repository: LearningRepository;
  entries?: VocabularyEntry[];
  today: string;
  examDate?: string;
  onComplete: (entries: VocabularyEntry[]) => void;
}) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [workload, setWorkload] = useState<VocabularyWorkload | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [warmedWords, setWarmedWords] = useState<VocabularyEntry[]>([]);

  useEffect(() => {
    let active = true;
    void repository.getDashboardSnapshot().then((value) => {
      if (!active) return;
      const next = buildVocabularyWorkload(entries, value.knowledgeStates ?? [], today, examDate ?? value.settings?.examDate ?? '2026-12-12', value.settings?.dailyMinutes ?? 60);
      setSnapshot(value); setWorkload(next); setPhase(next.dueWords.length ? 'review' : 'warmup');
    }).catch(() => { if (active) setError('今日词汇计划读取失败，请刷新后重试。'); });
    return () => { active = false; };
  }, [entries, examDate, repository, today]);

  const reviewWord = workload?.dueWords[reviewIndex];
  const reviewState = snapshot?.knowledgeStates.find((item) => item.itemId === reviewWord?.id);
  const dailyCollocations = selectDailyCollocations(collocationData as CollocationEntry[], snapshot?.knowledgeStates ?? [], `${today}T23:59:59.999Z`, 3);

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
      else setPhase('warmup');
      setAnswer('');
    } catch {
      setError('旧词复习结果保存失败，答案已保留，请重新提交。');
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

  if (phase === 'warmup') {
    if (!workload.newWords.length) return <section className="vocabulary-warmup complete"><h1>今日没有新词</h1><p>高频词已全部进入复习计划，接下来巩固重点搭配。</p><button className="primary-action" onClick={() => setPhase('collocations')}>继续学习重点搭配</button></section>;
    return <VocabularyWarmup repository={repository} entries={workload.newWords} limit={workload.newWords.length} onComplete={(words) => { setWarmedWords(words); setPhase('translation'); }} />;
  }

  if (phase === 'translation') return <VocabularyTranslationCheck repository={repository} words={warmedWords} states={snapshot.knowledgeStates} onComplete={() => setPhase('collocations')} />;

  return <CollocationCheck repository={repository} entries={dailyCollocations} allEntries={collocationData as CollocationEntry[]} states={snapshot.knowledgeStates} onComplete={() => onComplete(warmedWords)} />;
}
