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

  useEffect(() => {
    let current = true;
    void Promise.all([
      repository.listDueReviews(now),
      examDate ? Promise.resolve(examDate) : repository.getDashboardSnapshot(now).then((snapshot) => snapshot.settings.examDate),
    ]).then(([items, savedExamDate]) => { if (current) { setCards(items); setEffectiveExamDate(savedExamDate); setLoading(false); } });
    return () => { current = false; };
  }, [examDate, now, repository]);

  const shown = useMemo(() => cards.filter((card) => {
    if (filter === '今日到期') return card.stage < 4;
    if (filter === '已掌握') return card.stage >= 4;
    return filterKind(card.questionId) === filter;
  }), [cards, filter]);
  const activeCard = cards.find((card) => card.id === activeId) ?? null;
  const activeQuestion = activeCard ? getQuestion(activeCard.questionId) : null;

  const submit = async () => {
    if (!activeCard || !activeQuestion || !('options' in activeQuestion) || !response) return;
    const graded = gradeAnswer(activeQuestion as ObjectiveQuestion, response);
    const currentStudyDate = studyDate(new Date(now));
    const schedule = scheduleReviewStage(activeCard.stage, graded.correct, currentStudyDate, effectiveExamDate);
    const updated = { ...activeCard, stage: schedule.stage, nextReviewAt: schedule.nextReviewAt, lastCorrect: graded.correct, updatedAt: now };
    await repository.upsertReviewCard(updated);
    await repository.saveAttemptOnce({
      id: crypto.randomUUID(), userId: 'local-learner', questionId: activeQuestion.id, response,
      correct: graded.correct, score: graded.score, durationSeconds: 0, contentVersion: 'v1', kind: activeQuestion.type,
      mode: 'review', deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device', createdAt: now,
    });
    await completeDailyTask(repository, 'review', currentStudyDate);
    setCards((items) => items.map((item) => item.id === updated.id ? updated : item));
    setResult(graded.correct ? 'correct' : 'incorrect');
  };

  if (loading) return <p role="status">正在读取复习安排…</p>;
  if (activeCard && activeQuestion && 'options' in activeQuestion) return <section><button onClick={() => { setActiveId(null); setResponse(''); setResult(null); }}>← 返回复习列表</button><h1>重新练习</h1><ObjectiveQuestionView question={activeQuestion as ObjectiveQuestion} value={response} disabled={Boolean(result)} onChange={setResponse} />{!result && <button onClick={() => void submit()} disabled={!response}>提交复习答案</button>}{result && <div role="status"><strong>{result === 'correct' ? '复习正确' : '复习错误'}</strong><p>{activeQuestion.explanationZh}</p><MasteryCheck kind="review" taskId={`${studyDate(new Date(now))}:review`} repository={repository} now={now} sourceQuestionIds={[activeQuestion.id]} /></div>}</section>;

  return <section><h1>错题与复习</h1><div>{['今日到期', '听力', '阅读', '词汇', '已掌握'].map((value) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>{shown.length === 0 && <p>当前没有需要复习的题目。</p>}{shown.map((card) => { const question = getQuestion(card.questionId); return <article key={card.id}><h2>{question?.prompt ?? '题目内容暂不可用'}</h2><p>{filterKind(card.questionId)} · 第 {card.stage + 1} 阶段</p><button disabled={!question} onClick={() => setActiveId(card.id)}>重新练习</button></article>; })}</section>;
}
