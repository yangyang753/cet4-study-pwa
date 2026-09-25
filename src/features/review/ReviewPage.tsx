import { useEffect, useMemo, useState } from 'react';
import { getQuestion } from '../../content/catalog';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { ReviewCard } from '../../domain/learning';
import type { ObjectiveQuestion } from '../../domain/content';
import { gradeAnswer } from '../practice/gradeAnswer';
import { ObjectiveQuestion as ObjectiveQuestionView } from '../practice/ObjectiveQuestion';
import { scheduleReviewStage } from './scheduleReview';
import { completeDailyTask } from '../mastery/taskProgress';
import { MasteryCheck } from '../mastery/MasteryCheck';
import { studyDate } from '../../lib/studyDate';
import { QuestionTranslationGate, questionNeedsTranslation } from '../translation/QuestionTranslationGate';

const defaultRepository = new DexieLearningRepository();
const filterKind = (questionId: string) => {
  const type = getQuestion(questionId)?.type;
  if (type === 'news' || type === 'conversation' || type === 'passage') return '听力';
  if (type === 'reading' || type === 'matching' || type === 'cloze') return '阅读';
  if (type === 'vocabulary') return '词汇';
  return '其他';
};

export function ReviewPage({ repository = defaultRepository, now = new Date().toISOString(), examDate }: { repository?: LearningRepository; now?: string; examDate?: string }) {
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('今日到期');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [effectiveExamDate, setEffectiveExamDate] = useState(examDate ?? '2026-12-12');
  const [translationUnlocked, setTranslationUnlocked] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [attemptId, setAttemptId] = useState('');

  useEffect(() => {
    let current = true;
    setLoading(true);
    setLoadError('');
    void Promise.all([
      repository.listDueReviews(now),
      examDate ? Promise.resolve(examDate) : repository.getDashboardSnapshot(now).then((snapshot) => snapshot.settings.examDate),
    ]).then(([items, savedExamDate]) => { if (current) { setCards(items); setEffectiveExamDate(savedExamDate); setLoading(false); } }).catch(() => {
      if (current) { setLoadError('复习安排读取失败，请重试。'); setLoading(false); }
    });
    return () => { current = false; };
  }, [examDate, now, repository, reloadKey]);

  const shown = useMemo(() => cards.filter((card) => {
    if (filter === '今日到期') return card.stage < 4;
    if (filter === '已掌握') return card.stage >= 4;
    return filterKind(card.questionId) === filter;
  }), [cards, filter]);
  const activeCard = cards.find((card) => card.id === activeId) ?? null;
  const activeQuestion = activeCard ? getQuestion(activeCard.questionId) : null;
  const translationRequired = Boolean(activeQuestion && 'options' in activeQuestion && questionNeedsTranslation(activeQuestion as ObjectiveQuestion));

  const submit = async () => {
    if (!activeCard || !activeQuestion || !('options' in activeQuestion) || !response) return;
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');
    const graded = gradeAnswer(activeQuestion as ObjectiveQuestion, response);
    const currentStudyDate = studyDate(new Date(now));
    const schedule = scheduleReviewStage(activeCard.stage, graded.correct, currentStudyDate, effectiveExamDate);
    const updated = { ...activeCard, stage: schedule.stage, nextReviewAt: schedule.nextReviewAt, lastCorrect: graded.correct, updatedAt: now };
    const stableAttemptId = attemptId || crypto.randomUUID();
    if (!attemptId) setAttemptId(stableAttemptId);
    try {
      await repository.saveAttemptOnce({
        id: stableAttemptId, userId: 'local-learner', questionId: activeQuestion.id, response,
        correct: graded.correct, score: graded.score, durationSeconds: 0, contentVersion: 'v1', kind: activeQuestion.type,
        mode: 'review', deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device', createdAt: now,
      });
      await repository.upsertReviewCard(updated);
      await completeDailyTask(repository, 'review', currentStudyDate);
      setCards((items) => items.map((item) => item.id === updated.id ? updated : item));
      setResult(graded.correct ? 'correct' : 'incorrect');
    } catch {
      setSubmitError('复习进度保存失败，答案已保留，请重新保存。');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p role="status">正在读取复习安排…</p>;
  if (loadError) return <section><h1>错题与复习</h1><p role="alert">{loadError}</p><button onClick={() => setReloadKey((value) => value + 1)}>重新读取</button></section>;
  if (activeCard && activeQuestion && 'options' in activeQuestion) return <section><button onClick={() => { setActiveId(null); setResponse(''); setResult(null); setTranslationUnlocked(false); setSubmitError(''); setAttemptId(''); }}>← 返回复习列表</button><h1>重新练习</h1>{translationRequired && <QuestionTranslationGate key={activeQuestion.id} question={activeQuestion as ObjectiveQuestion} repository={repository} onUnlocked={() => setTranslationUnlocked(true)} />}<ObjectiveQuestionView question={activeQuestion as ObjectiveQuestion} value={response} disabled={Boolean(result) || submitting || (translationRequired && !translationUnlocked)} onChange={setResponse} />{submitError && <p role="alert">{submitError}</p>}{!result && <button onClick={() => void submit()} disabled={!response || submitting || (translationRequired && !translationUnlocked)}>{submitError ? '重新保存复习结果' : submitting ? '正在保存…' : '提交复习答案'}</button>}{result && <div role="status"><strong>{result === 'correct' ? '复习正确' : '复习错误'}</strong><p>{activeQuestion.explanationZh}</p><MasteryCheck kind="review" taskId={`${studyDate(new Date(now))}:review`} repository={repository} now={now} sourceQuestionIds={[activeQuestion.id]} /></div>}</section>;

  return <section><h1>错题与复习</h1><div>{['今日到期', '听力', '阅读', '词汇', '已掌握'].map((value) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>{shown.length === 0 && <p>当前没有需要复习的题目。</p>}{shown.map((card) => { const question = getQuestion(card.questionId); return <article key={card.id}><h2>{question?.prompt ?? '题目内容暂不可用'}</h2><p>{filterKind(card.questionId)} · 第 {card.stage + 1} 阶段</p><button disabled={!question} onClick={() => { setActiveId(card.id); setTranslationUnlocked(false); setSubmitError(''); setAttemptId(''); }}>重新练习</button></article>; })}</section>;
}
