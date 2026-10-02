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
import { createId } from '../../lib/createId';
import { QuestionTranslationGate, questionNeedsTranslation } from '../translation/QuestionTranslationGate';
import { learningVocabulary } from '../../content/vocabularyLearning';
import { SubjectiveEditor } from '../composition/SubjectiveEditor';
import type { SubjectiveFeedback } from '../composition/evaluateSubjective';
import { applyKnowledgeReviewResult } from '../mastery/knowledgeMastery';
import type { StrictVocabularyGrade } from '../vocabulary/strictVocabularyCheck';
import { buildWordReinforcement } from '../knowledge/wordReinforcement';
import { VocabularyRecallExercise } from '../vocabulary/VocabularyRecallExercise';
import { vocabularyReviewCard } from '../vocabulary/wordMastery';
import collocationData from '../../../content/v1/collocations.json';
import { buildCollocationRecallExercise, gradeCollocationRecall, type CollocationEntry } from '../collocations/collocationPractice';
import './review.css';

const defaultRepository = new DexieLearningRepository();
const normalizeLegacyVocabularyCard = (card: ReviewCard): ReviewCard =>
  card.wordId && card.format === 'objective' && card.questionId.endsWith(':meaning')
    ? { ...card, format: 'word-meaning' }
    : card;
const reviewQuestion = (card: ReviewCard) => {
  if (card.wordId) return null;
  const stored = getQuestion(card.questionId);
  return stored ?? null;
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

export function ReviewPage({ repository = defaultRepository, now = new Date().toISOString(), examDate, random = Math.random }: { repository?: LearningRepository; now?: string; examDate?: string; random?: () => number }) {
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
  const [meaningFeedback, setMeaningFeedback] = useState('');

  useEffect(() => {
    let current = true;
    void Promise.all([
      typeof repository.listAllReviews === 'function' ? repository.listAllReviews() : repository.listDueReviews(now),
      examDate ? Promise.resolve(examDate) : repository.getDashboardSnapshot(now).then((snapshot) => snapshot.settings.examDate),
    ]).then(([items, savedExamDate]) => { if (current) { setCards(items.map(normalizeLegacyVocabularyCard)); setEffectiveExamDate(savedExamDate); setLoading(false); } }).catch(() => {
      if (current) { setLoadError('复习安排读取失败，请重试。'); setLoading(false); }
    });
    return () => { current = false; };
  }, [examDate, now, repository, reloadKey]);

  const shown = useMemo(() => cards.filter((card) => {
    if (filter === '今日到期') return Date.parse(card.nextReviewAt) <= Date.parse(now);
    if (filter === '已掌握') return card.stage >= 4;
    return filterKind(card) === filter;
  }), [cards, filter, now]);
  const dueCount = cards.filter((card) => Date.parse(card.nextReviewAt) <= Date.parse(now)).length;
  const masteredCount = cards.filter((card) => card.stage >= 4).length;
  const learningCount = cards.length - masteredCount;
  const activeCard = cards.find((card) => card.id === activeId) ?? null;
  const activeWord = activeCard?.wordId ? learningVocabulary.find((word) => word.id === activeCard.wordId) : null;
  const activeQuestion = activeCard ? reviewQuestion(activeCard) : null;
  const activeCollocation = activeCard?.knowledgeKind === 'collocation' ? (collocationData as CollocationEntry[]).find((item) => item.id === activeCard.knowledgeItemId) ?? null : null;
  const activeWordExercise = useMemo(() => activeWord ? buildWordReinforcement(activeWord, random) : null, [activeWord, random]);
  const activeCollocationExercise = useMemo(() => activeCollocation ? buildCollocationRecallExercise(activeCollocation, random) : null, [activeCollocation, random]);
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
    const stableAttemptId = attemptId || createId();
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

  const submitVocabulary = async (answer: { english: string; chinese: string }, grade: StrictVocabularyGrade) => {
    if (!activeCard || !activeWord || submitting) return;
    setSubmitting(true); setSubmitError('');
    const currentStudyDate = studyDate(new Date(now));
    const schedule = scheduleReviewStage(activeCard.stage, grade.correct, currentStudyDate, effectiveExamDate);
    let updated = { ...activeCard, stage: schedule.stage, nextReviewAt: schedule.nextReviewAt, lastCorrect: grade.correct, updatedAt: now };
    const stableAttemptId = attemptId || createId();
    if (!attemptId) setAttemptId(stableAttemptId);
    try {
      await repository.saveAttemptOnce({
        id: stableAttemptId, userId: 'local-learner', questionId: activeCard.questionId,
        response: [answer.english, answer.chinese].filter(Boolean).join('｜'),
        correct: grade.correct, score: grade.correct ? 1 : 0, durationSeconds: 0, contentVersion: 'v1', kind: 'vocabulary',
        mode: 'review', deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device', createdAt: now,
      });
      const snapshot = await repository.getDashboardSnapshot(now);
      const current = snapshot.knowledgeStates.find((state) => state.itemId === activeWord.id);
      const next = applyKnowledgeReviewResult(current, activeWord.id, grade.correct, now);
      await repository.upsertKnowledgeState(next);
      updated = { ...updated, knowledgeItemId: activeWord.id, knowledgeKind: 'vocabulary', stage: next.reviewStage ?? 0, nextReviewAt: grade.correct ? next.nextReviewAt ?? now : now };
      await repository.upsertReviewCard(updated);
      const spellingCard = vocabularyReviewCard(activeWord.id, 'cloze', now);
      const meaningCard = vocabularyReviewCard(activeWord.id, 'meaning', now);
      if (!grade.spellingCorrect && activeCard.id !== spellingCard.id) await repository.upsertReviewCard(spellingCard);
      if ((grade.missingMeanings.length || grade.unexpectedMeanings.length) && activeCard.id !== meaningCard.id) await repository.upsertReviewCard(meaningCard);
      await completeDailyTask(repository, 'review', currentStudyDate);
      setCards((items) => items.map((item) => item.id === updated.id ? updated : item));
      const details = [grade.missingMeanings.length ? `漏译：${grade.missingMeanings.join('、')}` : '', grade.unexpectedMeanings.length ? `多写或误译：${grade.unexpectedMeanings.join('、')}` : ''].filter(Boolean).join('；');
      setMeaningFeedback(grade.correct ? '拼写与释义均已通过，本次不会新增错题。' : `${!grade.spellingCorrect ? `正确拼写：${activeWord.word}` : ''}${!grade.spellingCorrect && details ? '；' : ''}${details || '该词已重新加入待复习。'}`);
      setResult(grade.correct ? 'correct' : 'incorrect');
    } finally { setSubmitting(false); }
  };

  const submitCollocation = async () => {
    if (!activeCard || !activeCollocation || !activeCollocationExercise || !response.trim() || submitting) return;
    const correct = gradeCollocationRecall(activeCollocationExercise, response);
    const currentStudyDate = studyDate(new Date(now));
    const stableAttemptId = attemptId || createId();
    if (!attemptId) setAttemptId(stableAttemptId);
    setSubmitting(true); setSubmitError('');
    try {
      const snapshot = await repository.getDashboardSnapshot(now);
      const current = snapshot.knowledgeStates.find((state) => state.itemId === activeCollocation.id);
      const next = applyKnowledgeReviewResult(current, activeCollocation.id, correct, now);
      const updated = { ...activeCard, stage: next.reviewStage ?? 0, nextReviewAt: correct ? next.nextReviewAt ?? now : now, lastCorrect: correct, updatedAt: now };
      await repository.saveAttemptOnce({ id: stableAttemptId, userId: 'local-learner', questionId: activeCard.questionId, response, correct, score: correct ? 1 : 0, durationSeconds: 0, contentVersion: 'v1', kind: 'collocation', mode: 'review', deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device', createdAt: now });
      await repository.upsertKnowledgeState(next);
      await repository.upsertReviewCard(updated);
      await completeDailyTask(repository, 'review', currentStudyDate);
      setCards((items) => items.map((item) => item.id === updated.id ? updated : item));
      setResult(correct ? 'correct' : 'incorrect');
    } catch { setSubmitError('重点搭配复习保存失败，答案已保留，请重试。'); }
    finally { setSubmitting(false); }
  };

  const submitSubjective = async (body: string, feedback: SubjectiveFeedback) => {
    if (!activeCard || !activeQuestion || 'options' in activeQuestion || submitting || result) return;
    setSubmitting(true); setSubmitError('');
    const correct = feedback.passed;
    const currentStudyDate = studyDate(new Date(now));
    const schedule = scheduleReviewStage(activeCard.stage, correct, currentStudyDate, effectiveExamDate);
    const updated = { ...activeCard, stage: schedule.stage, nextReviewAt: schedule.nextReviewAt, lastCorrect: correct, updatedAt: now };
    const stableAttemptId = attemptId || createId();
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

  const closeActive = () => { setActiveId(null); setResponse(''); setResult(null); setTranslationUnlocked(false); setSubmitError(''); setAttemptId(''); setMeaningFeedback(''); };

  if (loading) return <section className="review-state-panel" role="status"><span className="review-state-icon">↻</span><h1>正在整理复习计划</h1><p>正在读取你的错题与掌握记录…</p></section>;
  if (loadError) return <section className="review-state-panel"><span className="review-state-icon">!</span><h1>复习安排暂时无法读取</h1><p role="alert">{loadError}</p><button className="review-primary-button" onClick={() => { setLoading(true); setLoadError(''); setReloadKey((value) => value + 1); }}>重新读取</button></section>;
  if (activeCard && activeWord && activeWordExercise) return <section className="review-detail-page"><button className="review-back-button" onClick={closeActive}>← 返回复习列表</button><header className="review-detail-header"><span>VOCABULARY REVIEW</span><h1>随机主动回忆</h1><p>题型会在完整释义、完整拼写、随机挖空和双重检测之间变化；只有答错或漏译才会新增错题。</p></header><VocabularyRecallExercise key={`${activeCard.id}:${activeWordExercise.id}:${activeWordExercise.cloze}`} exercise={activeWordExercise} result={result} feedback={meaningFeedback} onSubmit={({ answer, grade }) => submitVocabulary(answer, grade)} /></section>;
  if (activeCard && activeCollocation && activeCollocationExercise) return <section className="review-detail-page"><button className="review-back-button" onClick={closeActive}>← 返回复习列表</button><header className="review-detail-header"><span>COLLOCATION RECALL</span><h1>重点搭配随机巩固</h1><p>随机中英互译或挖空，不提供选项。</p></header><div className="review-practice-panel"><strong>{activeCollocationExercise.prompt}</strong><label>填写重点搭配<input aria-label="填写重点搭配" value={response} disabled={Boolean(result) || submitting} onChange={(event) => setResponse(event.target.value)} /></label>{submitError && <p role="alert">{submitError}</p>}{!result && <button className="review-primary-button" disabled={!response.trim() || submitting} onClick={() => void submitCollocation()}>提交搭配复习</button>}{result && <div className={`review-result review-result-${result}`} role="status"><strong>{result === 'correct' ? '复习正确' : '复习错误'}</strong>{result === 'incorrect' && <p>正确答案：{activeCollocationExercise.answer}</p>}</div>}</div></section>;
  if (activeCard && activeQuestion && 'options' in activeQuestion) return <section className="review-detail-page"><button className="review-back-button" onClick={closeActive}>← 返回复习列表</button><header className="review-detail-header"><span>FOCUSED PRACTICE</span><h1>重新练习</h1><p>完成当前检测后，系统会自动更新掌握阶段和下次复习日期。</p></header><div className="review-practice-panel">{translationRequired && <QuestionTranslationGate key={activeQuestion.id} question={activeQuestion as ObjectiveQuestion} repository={repository} onUnlocked={() => setTranslationUnlocked(true)} />}<ObjectiveQuestionView question={activeQuestion as ObjectiveQuestion} value={response} disabled={Boolean(result) || submitting || (translationRequired && !translationUnlocked)} onChange={setResponse} />{submitError && <p role="alert">{submitError}</p>}{!result && <button className="review-primary-button" onClick={() => void submit()} disabled={!response || submitting || (translationRequired && !translationUnlocked)}>{submitError ? '重新保存复习结果' : submitting ? '正在保存…' : '提交复习答案'}</button>}{result && <div className={`review-result review-result-${result}`} role="status"><strong>{result === 'correct' ? '复习正确' : '复习错误'}</strong><p>{activeQuestion.explanationZh}</p><MasteryCheck kind="review" taskId={`${studyDate(new Date(now))}:review`} repository={repository} now={now} sourceQuestionIds={[activeQuestion.id]} /></div>}</div></section>;

  if (activeCard && activeQuestion && !('options' in activeQuestion)) return <section className="review-detail-page"><button className="review-back-button" onClick={closeActive}>← 返回复习列表</button><header className="review-detail-header"><span>SUBJECTIVE REVIEW</span><h1>{activeQuestion.type === 'writing' ? '写作错题重练' : '翻译错题重练'}</h1><p>根据反馈重新完成表达，系统会自动保存并安排后续巩固。</p></header><div className="review-practice-panel">{!result && <SubjectiveEditor question={activeQuestion as SubjectiveQuestion} kind={activeQuestion.type} repository={repository} onSubmit={(body, feedback) => void submitSubjective(body, feedback)} />}{submitError && <p role="alert">{submitError}</p>}{result && <div className={`review-result review-result-${result}`} role="status"><strong>主观题复习已保存</strong><p>{result === 'correct' ? '规则化检查通过，已安排下一次巩固。' : '仍有关键项未通过，已重新加入待复习。'}</p></div>}</div></section>;

  const filters = ['今日到期', '听力', '阅读', '词汇', '重点搭配', '语法', '写作', '翻译', '已掌握'];
  return <section className="review-page">
    <header className="review-hero">
      <div><span className="review-eyebrow">SMART REVIEW</span><h1>错题复习中心</h1><p>系统按照遗忘规律安排复习。测试通过自动升级，答错则回到待掌握队列。</p></div>
      <div className="review-hero-badge" aria-label={`${dueCount} 项今日待复习`}><strong>{dueCount}</strong><span>今日待复习</span></div>
    </header>
    <section className="review-overview" aria-label="复习概览">
      <div className="review-stat review-stat-highlight"><span>今日待复习</span><strong>{dueCount}</strong><small>优先完成到期内容</small></div>
      <div className="review-stat"><span>学习中</span><strong>{learningCount}</strong><small>正在间隔巩固</small></div>
      <div className="review-stat"><span>已掌握</span><strong>{masteredCount}</strong><small>后续仍会抽查</small></div>
    </section>
    <div className="review-toolbar">
      <div><span className="review-section-kicker">复习队列</span><h2>选择要巩固的内容</h2></div>
      <div className="review-filters" role="group" aria-label="复习分类">{filters.map((value) => <button className="review-filter" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>
    </div>
    <div className="review-list-heading"><h2>{filter}</h2><span>共 {shown.length} 项</span></div>
    {shown.length === 0 && <div className="review-empty"><span>✓</span><h2>这一组已经清空</h2><p>当前没有需要复习的题目。</p><small>可以切换分类查看其他内容。</small></div>}
    <div className="review-grid">{shown.map((card) => {
      const question = reviewQuestion(card);
      const word = card.wordId ? learningVocabulary.find((item) => item.id === card.wordId) : null;
      const available = Boolean(question || word);
      const actionLabel = word ? `重新练习 ${word.word}` : undefined;
      const kind = filterKind(card);
      const due = Date.parse(card.nextReviewAt) <= Date.parse(now);
      const progress = Math.min(card.stage, 4);
      return <article className="review-card" key={card.id}>
        <div className="review-card-top"><span className="review-kind">{kind}</span><span className={`review-status ${card.stage >= 4 ? 'is-mastered' : due ? 'is-due' : ''}`}>{card.stage >= 4 ? '已掌握' : due ? '今日到期' : '巩固中'}</span></div>
        <h2>{word ? `${word.word} · ${word.meaningZh}` : question?.prompt ?? '题目内容暂不可用'}</h2>
        <p className="review-stage-label">掌握进度 · 第 {Math.min(card.stage + 1, 4)} 阶段</p>
        <div className="review-stage-dots" role="progressbar" aria-label="掌握进度" aria-valuemin={0} aria-valuemax={4} aria-valuenow={progress}>{[0, 1, 2, 3].map((stage) => <span className={stage < card.stage ? 'is-complete' : ''} key={stage} />)}</div>
        <footer><small>{due ? '下次检测：现在' : `未到复习时间 · ${new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(card.nextReviewAt))}`}</small><button className="review-action-button" aria-label={actionLabel} disabled={!available || !due} onClick={() => { setActiveId(card.id); setResponse(''); setResult(null); setTranslationUnlocked(false); setSubmitError(''); setAttemptId(''); setMeaningFeedback(''); }}>重新练习 <span aria-hidden="true">→</span></button></footer>
      </article>;
    })}</div>
  </section>;
}
