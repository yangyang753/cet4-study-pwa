import { useEffect, useMemo, useState } from 'react';
import { getQuestion } from '../../content/catalog';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { ReviewCard } from '../../domain/learning';
import type { ObjectiveQuestion, SubjectiveQuestion } from '../../domain/content';
import { gradeAnswer } from '../practice/gradeAnswer';
import { ObjectiveQuestion as ObjectiveQuestionView } from '../practice/ObjectiveQuestion';
import { scheduleReviewStage } from './scheduleReview';
import { completeDailyTask } from '../mastery/taskProgress';
import { MasteryCheck } from '../mastery/MasteryCheck';
import { studyDate } from '../../lib/studyDate';
import { QuestionTranslationGate, questionNeedsTranslation } from '../translation/QuestionTranslationGate';
import { learningVocabulary } from '../../content/vocabularyLearning';
import { buildWordCloze } from '../vocabulary/vocabularySchedule';
import { buildWarmupQuestions } from '../vocabulary/buildWarmupQuestions';
import { SubjectiveEditor } from '../composition/SubjectiveEditor';
import type { SubjectiveFeedback } from '../composition/evaluateSubjective';
import { applyKnowledgeReviewResult } from '../mastery/knowledgeMastery';

const defaultRepository = new DexieLearningRepository();
const reviewQuestion = (card: ReviewCard) => {
  const stored = getQuestion(card.questionId);
  if (stored) return stored;
  if (card.format !== 'objective' || !card.wordId) return null;
  const word = learningVocabulary.find((item) => item.id === card.wordId);
  return word ? buildWarmupQuestions([word], learningVocabulary)[0] : null;
};
const filterKind = (card: ReviewCard) => {
  if (card.knowledgeKind === 'collocation') return '重点搭配';
  if (card.knowledgeKind === 'grammar') return '语法';
  if (card.format === 'word-cloze' || card.wordId || card.knowledgeKind === 'vocabulary') return '词汇';
  const type = getQuestion(card.questionId)?.type;
  if (type === 'news' || type === 'conversation' || type === 'passage') return '听力';
  if (type === 'reading' || type === 'matching' || type === 'cloze') return '阅读';
  if (type === 'vocabulary') return '词汇';
  if (type === 'collocation') return '重点搭配';
  if (type === 'grammar') return '语法';
  if (type === 'writing') return '写作';
  if (type === 'translation') return '翻译';
  return '其他';
};

const knowledgeIdentity = (card: ReviewCard, question: ReturnType<typeof reviewQuestion>) => {
  if (card.wordId) return { itemId: card.wordId, kind: 'vocabulary' as const };
  if (card.knowledgeItemId && card.knowledgeKind) return { itemId: card.knowledgeItemId, kind: card.knowledgeKind };
  const point = question?.knowledgePointIds.find((id) => /^(vocabulary|collocation|grammar):/.test(id));
  if (!point) return null;
  const [kind, itemId] = point.split(':');
  return { itemId, kind: kind as 'vocabulary' | 'collocation' | 'grammar' };
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
    void Promise.all([
      typeof repository.listAllReviews === 'function' ? repository.listAllReviews() : repository.listDueReviews(now),
      examDate ? Promise.resolve(examDate) : repository.getDashboardSnapshot(now).then((snapshot) => snapshot.settings.examDate),
    ]).then(([items, savedExamDate]) => { if (current) { setCards(items); setEffectiveExamDate(savedExamDate); setLoading(false); } }).catch(() => {
      if (current) { setLoadError('复习安排读取失败，请重试。'); setLoading(false); }
    });
    return () => { current = false; };
  }, [examDate, now, repository, reloadKey]);

  const shown = useMemo(() => cards.filter((card) => {
    if (filter === '今日到期') return Date.parse(card.nextReviewAt) <= Date.parse(now);
    if (filter === '已掌握') return card.stage >= 4;
    return filterKind(card) === filter;
  }), [cards, filter, now]);
  const activeCard = cards.find((card) => card.id === activeId) ?? null;
  const activeWord = activeCard?.wordId ? learningVocabulary.find((word) => word.id === activeCard.wordId) : null;
  const activeQuestion = activeCard ? reviewQuestion(activeCard) : null;
  const translationRequired = Boolean(activeQuestion && 'options' in activeQuestion && questionNeedsTranslation(activeQuestion as ObjectiveQuestion));

  const submit = async () => {
    if (!activeCard || !activeQuestion || !('options' in activeQuestion) || !response) return;
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');
    const graded = gradeAnswer(activeQuestion as ObjectiveQuestion, response);
    const currentStudyDate = studyDate(new Date(now));
    const schedule = scheduleReviewStage(activeCard.stage, graded.correct, currentStudyDate, effectiveExamDate);
    let updated = { ...activeCard, stage: schedule.stage, nextReviewAt: schedule.nextReviewAt, lastCorrect: graded.correct, updatedAt: now };
    const stableAttemptId = attemptId || crypto.randomUUID();
    if (!attemptId) setAttemptId(stableAttemptId);
    try {
      await repository.saveAttemptOnce({
        id: stableAttemptId, userId: 'local-learner', questionId: activeQuestion.id, response,
        correct: graded.correct, score: graded.score, durationSeconds: 0, contentVersion: 'v1', kind: activeQuestion.type,
        mode: 'review', deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device', createdAt: now,
      });
      const identity = knowledgeIdentity(activeCard, activeQuestion);
      if (identity) {
        const snapshot = await repository.getDashboardSnapshot(now);
        const current = snapshot.knowledgeStates.find((state) => state.itemId === identity.itemId);
        const next = applyKnowledgeReviewResult(current, identity.itemId, graded.correct, now);
        await repository.upsertKnowledgeState(next);
        updated = { ...updated, knowledgeItemId: identity.itemId, knowledgeKind: identity.kind, stage: next.reviewStage ?? 0, nextReviewAt: graded.correct ? next.nextReviewAt ?? now : now };
      }
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

  const submitCloze = async () => {
    if (!activeCard || !activeWord || !response.trim() || submitting) return;
    setSubmitting(true); setSubmitError('');
    const correct = response.trim().toLowerCase() === activeWord.word.toLowerCase();
    const currentStudyDate = studyDate(new Date(now));
    const schedule = scheduleReviewStage(activeCard.stage, correct, currentStudyDate, effectiveExamDate);
    let updated = { ...activeCard, stage: schedule.stage, nextReviewAt: schedule.nextReviewAt, lastCorrect: correct, updatedAt: now };
    const stableAttemptId = attemptId || crypto.randomUUID();
    if (!attemptId) setAttemptId(stableAttemptId);
    try {
      await repository.saveAttemptOnce({
        id: stableAttemptId, userId: 'local-learner', questionId: activeCard.questionId, response,
        correct, score: correct ? 1 : 0, durationSeconds: 0, contentVersion: 'v1', kind: 'vocabulary',
        mode: 'review', deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device', createdAt: now,
      });
      const snapshot = await repository.getDashboardSnapshot(now);
      const current = snapshot.knowledgeStates.find((state) => state.itemId === activeWord.id);
      const next = applyKnowledgeReviewResult(current, activeWord.id, correct, now);
      await repository.upsertKnowledgeState(next);
      updated = { ...updated, knowledgeItemId: activeWord.id, knowledgeKind: 'vocabulary', stage: next.reviewStage ?? 0, nextReviewAt: correct ? next.nextReviewAt ?? now : now };
      await repository.upsertReviewCard(updated);
      await completeDailyTask(repository, 'review', currentStudyDate);
      setCards((items) => items.map((item) => item.id === updated.id ? updated : item));
      setResult(correct ? 'correct' : 'incorrect');
    } catch {
      setSubmitError('复习进度保存失败，答案已保留，请重新保存。');
    } finally {
      setSubmitting(false);
    }
  };

  const submitSubjective = async (body: string, feedback: SubjectiveFeedback) => {
    if (!activeCard || !activeQuestion || 'options' in activeQuestion || submitting || result) return;
    setSubmitting(true); setSubmitError('');
    const correct = feedback.passed;
    const currentStudyDate = studyDate(new Date(now));
    const schedule = scheduleReviewStage(activeCard.stage, correct, currentStudyDate, effectiveExamDate);
    const updated = { ...activeCard, stage: schedule.stage, nextReviewAt: schedule.nextReviewAt, lastCorrect: correct, updatedAt: now };
    const stableAttemptId = attemptId || crypto.randomUUID();
    if (!attemptId) setAttemptId(stableAttemptId);
    try {
      await repository.saveAttemptOnce({
        id: stableAttemptId, userId: 'local-learner', questionId: activeQuestion.id, response: body,
        correct, score: feedback.score, durationSeconds: 0, contentVersion: 'v1', kind: activeQuestion.type,
        mode: 'review', deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device', createdAt: now,
      });
      await repository.upsertReviewCard(updated);
      await completeDailyTask(repository, 'review', currentStudyDate);
      setCards((items) => items.map((item) => item.id === updated.id ? updated : item));
      setResult(correct ? 'correct' : 'incorrect');
    } catch {
      setSubmitError('主观题复习保存失败，文字已保留，请重新提交。');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p role="status">正在读取复习安排…</p>;
  if (loadError) return <section><h1>错题与复习</h1><p role="alert">{loadError}</p><button onClick={() => { setLoading(true); setLoadError(''); setReloadKey((value) => value + 1); }}>重新读取</button></section>;
  if (activeCard?.format === 'word-cloze' && activeWord) return <section><button onClick={() => { setActiveId(null); setResponse(''); setResult(null); setSubmitError(''); setAttemptId(''); }}>← 返回复习列表</button><h1>拼写补全复习</h1><article className="warmup-card"><h2>{buildWordCloze(activeWord.word, activeCard.stage)}</h2><p>{activeWord.meaningZh}</p><label>补全单词<input aria-label="补全单词" autoComplete="off" value={response} disabled={Boolean(result) || submitting} onChange={(event) => setResponse(event.target.value)} /></label>{submitError && <p role="alert">{submitError}</p>}{!result && <button onClick={() => void submitCloze()} disabled={!response.trim() || submitting}>{submitError ? '重新保存复习结果' : submitting ? '正在保存…' : '提交拼写复习'}</button>}{result && <div role="status"><strong>{result === 'correct' ? '复习正确' : '复习错误'}</strong><p>{result === 'correct' ? '已按间隔复习计划安排下一次检测。' : `正确拼写：${activeWord.word}。该词已自动改为待复习。`}</p></div>}</article></section>;
  if (activeCard && activeQuestion && 'options' in activeQuestion) return <section><button onClick={() => { setActiveId(null); setResponse(''); setResult(null); setTranslationUnlocked(false); setSubmitError(''); setAttemptId(''); }}>← 返回复习列表</button><h1>重新练习</h1>{translationRequired && <QuestionTranslationGate key={activeQuestion.id} question={activeQuestion as ObjectiveQuestion} repository={repository} onUnlocked={() => setTranslationUnlocked(true)} />}<ObjectiveQuestionView question={activeQuestion as ObjectiveQuestion} value={response} disabled={Boolean(result) || submitting || (translationRequired && !translationUnlocked)} onChange={setResponse} />{submitError && <p role="alert">{submitError}</p>}{!result && <button onClick={() => void submit()} disabled={!response || submitting || (translationRequired && !translationUnlocked)}>{submitError ? '重新保存复习结果' : submitting ? '正在保存…' : '提交复习答案'}</button>}{result && <div role="status"><strong>{result === 'correct' ? '复习正确' : '复习错误'}</strong><p>{activeQuestion.explanationZh}</p><MasteryCheck kind="review" taskId={`${studyDate(new Date(now))}:review`} repository={repository} now={now} sourceQuestionIds={[activeQuestion.id]} /></div>}</section>;

  if (activeCard && activeQuestion && !('options' in activeQuestion)) return <section><button onClick={() => { setActiveId(null); setResult(null); setSubmitError(''); setAttemptId(''); }}>← 返回复习列表</button><h1>{activeQuestion.type === 'writing' ? '写作错题重练' : '翻译错题重练'}</h1>{!result && <SubjectiveEditor question={activeQuestion as SubjectiveQuestion} kind={activeQuestion.type} repository={repository} onSubmit={(body, feedback) => void submitSubjective(body, feedback)} />}{submitError && <p role="alert">{submitError}</p>}{result && <div role="status"><strong>主观题复习已保存</strong><p>{result === 'correct' ? '规则化检查通过，已安排下一次巩固。' : '仍有关键项未通过，已重新加入待复习。'}</p></div>}</section>;

  return <section><h1>错题与复习</h1><div>{['今日到期', '听力', '阅读', '词汇', '重点搭配', '语法', '写作', '翻译', '已掌握'].map((value) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>{shown.length === 0 && <p>当前没有需要复习的题目。</p>}{shown.map((card) => { const question = reviewQuestion(card); const word = card.wordId ? learningVocabulary.find((item) => item.id === card.wordId) : null; const available = Boolean(question || (card.format === 'word-cloze' && word)); const actionLabel = word && card.format === 'word-cloze' ? `复习拼写 ${word.word}` : word && card.format === 'objective' ? `重新练习 ${word.word} 词义` : undefined; return <article key={card.id}><h2>{word ? `${word.word} · ${word.meaningZh}` : question?.prompt ?? '题目内容暂不可用'}</h2><p>{filterKind(card)} · 第 {card.stage + 1} 阶段</p><button aria-label={actionLabel} disabled={!available} onClick={() => { setActiveId(card.id); setResponse(''); setResult(null); setTranslationUnlocked(false); setSubmitError(''); setAttemptId(''); }}>重新练习</button></article>; })}</section>;
}
