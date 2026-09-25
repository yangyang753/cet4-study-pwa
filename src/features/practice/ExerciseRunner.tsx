import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import rawContent from '../../content/starter/content.json';
import { getPracticeItems } from '../../content/catalog';
import { parseContentPack } from '../../content/schema';
import type { ObjectiveQuestion as ObjectiveQuestionType, PracticeKind, Question } from '../../domain/content';
import { ExplanationPanel } from './ExplanationPanel';
import { gradeAnswer, type GradeResult } from './gradeAnswer';
import { ObjectiveQuestion } from './ObjectiveQuestion';
import { SubjectiveEditor } from '../composition/SubjectiveEditor';
import './practice.css';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import { completeDailyTask, localStudyDate } from '../mastery/taskProgress';
import { MasteryCheck } from '../mastery/MasteryCheck';
import type { Attempt, MistakeReason } from '../../domain/attempt';
import { selectPracticeQuestions } from './selectPracticeQuestions';
import { DailyVocabularySession } from '../vocabulary/DailyVocabularySession';
import { buildWarmupQuestions } from '../vocabulary/buildWarmupQuestions';
import { learningVocabulary } from '../../content/vocabularyLearning';
import { QuestionTranslationGate, questionNeedsTranslation } from '../translation/QuestionTranslationGate';

const starterContent = parseContentPack(rawContent);
const defaultRepository = new DexieLearningRepository();
const practiceKinds: PracticeKind[] = ['vocabulary', 'grammar', 'listening', 'reading', 'translation', 'writing'];
interface AnsweredItem { questionId: string; correct: boolean | null; durationSeconds: number }
const reasonPriority: Record<MistakeReason, number> = { unknown: 6, misunderstood: 6, location: 5, guessed: 5, careless: 3, overtime: 4 };

export function ExerciseRunner({ setId, kind, limit = 5, mode = 'practice', repository = defaultRepository, userId = 'local-learner', today = localStudyDate() }: { setId?: string; kind?: PracticeKind; limit?: number; mode?: 'practice' | 'exam'; repository?: LearningRepository; userId?: string; today?: string }) {
  const initialQuestions = useMemo<Question[]>(() => {
    if (kind) return selectPracticeQuestions(getPracticeItems(kind), [], { kind, date: today, limit });
    const practiceSet = starterContent.practiceSets.find((set) => set.id === setId);
    return practiceSet?.questionIds.map((id) => starterContent.questions.find((question) => question.id === id)!).filter(Boolean) ?? [];
  }, [kind, limit, setId, today]);
  const [questions, setQuestions] = useState<Question[] | null>(() => kind ? null : initialQuestions);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [answerError, setAnswerError] = useState('');
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [answered, setAnswered] = useState<AnsweredItem[]>([]);
  const [finished, setFinished] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState<Attempt | null>(null);
  const [selectedReason, setSelectedReason] = useState<MistakeReason | undefined>();
  const [warmupComplete, setWarmupComplete] = useState(kind !== 'vocabulary' || mode !== 'practice');
  const [translationUnlocked, setTranslationUnlocked] = useState(mode === 'exam' || !kind);
  const question = questions?.[index];
  const plannedKind = kind;
  const translationRequired = Boolean(mode === 'practice' && kind && question && 'options' in question && questionNeedsTranslation(question as ObjectiveQuestionType));

  useEffect(() => {
    if (!kind) return;
    let active = true;
    void (async () => {
      try {
        const attempts = await repository.listAttempts();
        if (active) setQuestions(selectPracticeQuestions(getPracticeItems(kind), attempts, { kind, date: today, limit }));
      } catch {
        if (active) setQuestions(initialQuestions);
      }
    })();
    return () => { active = false; };
  }, [initialQuestions, kind, limit, repository, today]);

  if (!warmupComplete) return <DailyVocabularySession repository={repository} today={today} onComplete={(entries) => {
    setQuestions(entries.length ? buildWarmupQuestions(entries, learningVocabulary) : initialQuestions);
    setWarmupComplete(true);
  }} />;
  if (questions === null) return <p role="status">正在根据学习记录选题…</p>;
  if (!question) return <p>未找到这组练习。</p>;
  const questionCount = questions.length;
  const questionId = question.id;
  if (finished) {
    const correct = answered.filter((item) => item.correct).length;
    const durationSeconds = answered.reduce((sum, item) => sum + item.durationSeconds, 0);
    return <section className="practice-summary"><h1>练习完成</h1><p>完成 {answered.length} 题，答对 {correct} 题，用时 {durationSeconds} 秒。</p><p>错题 {answered.filter((item) => item.correct === false).length} 道，已经加入复习安排。</p>{plannedKind && mode === 'practice' && <MasteryCheck kind={plannedKind} taskId={`${today}:${plannedKind}`} repository={repository} sourceQuestionIds={answered.map((item) => item.questionId)} />}</section>;
  }

  const duration = () => Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  const baseAttempt = (responseValue: unknown, correct: boolean | null, score: number | null): Attempt => ({
    id: crypto.randomUUID(), userId, questionId, response: responseValue, correct, score,
    durationSeconds: duration(), contentVersion: 'v1', kind: kind ?? question.type, mode,
    deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device', createdAt: new Date().toISOString(),
  });

  async function persistObjectiveAttempt(attempt: Attempt, graded: GradeResult) {
    setSaveState('saving');
    try {
      await repository.saveAttemptOnce(attempt);
      if (!graded.correct) await repository.upsertReviewCard({
        id: `review:${attempt.questionId}`, questionId: attempt.questionId, stage: 0, priority: 6,
        nextReviewAt: attempt.createdAt, lastCorrect: false, updatedAt: attempt.createdAt,
      });
      setAnswered((items) => [...items, {
        questionId: attempt.questionId,
        correct: graded.correct,
        durationSeconds: attempt.durationSeconds,
      }]);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }

  function submit() {
    if (!response) { setAnswerError('请选择一个答案'); return; }
    const graded = gradeAnswer(question as ObjectiveQuestionType, response);
    setAnswerError(''); setResult(graded);
    const attempt = baseAttempt(response, graded.correct, graded.score);
    setCurrentAttempt(attempt);
    void persistObjectiveAttempt(attempt, graded);
  }

  function retrySave() {
    if (!currentAttempt || !result || saveState !== 'error') return;
    void persistObjectiveAttempt(currentAttempt, result);
  }

  async function saveReason(reason: MistakeReason) {
    if (!currentAttempt || saveState !== 'saved') return;
    const updated = { ...currentAttempt, mistakeReason: reason, updatedAt: new Date().toISOString() };
    setSelectedReason(reason);
    setCurrentAttempt(updated);
    await repository.saveAttempt(updated);
    const existing = await repository.getReviewCard(`review:${currentAttempt.questionId}`);
    await repository.upsertReviewCard({
      id: `review:${currentAttempt.questionId}`,
      questionId: currentAttempt.questionId,
      stage: existing?.stage ?? 0,
      priority: reasonPriority[reason],
      reason,
      nextReviewAt: existing?.nextReviewAt ?? updated.updatedAt!,
      lastCorrect: existing?.lastCorrect ?? Boolean(currentAttempt.correct),
      updatedAt: updated.updatedAt!,
    });
  }

  async function next() {
    if (index >= questionCount - 1) {
      if (plannedKind && mode === 'practice') await completeDailyTask(repository, plannedKind, today);
      setFinished(true); return;
    }
    setIndex((value) => value + 1);
    setResponse(''); setResult(null); setSaveState('idle'); setAnswerError(''); setCurrentAttempt(null); setSelectedReason(undefined); setTranslationUnlocked(mode === 'exam' || !kind); setStartedAt(Date.now());
  }

  if (!('options' in question)) return <SubjectiveEditor question={question} kind={question.type} repository={repository} onSubmit={(body, feedback) => {
    const seconds = duration();
    void repository.saveAttemptOnce(baseAttempt(body, feedback.passed, feedback.score)).then(async () => {
      if (plannedKind && mode === 'practice') await completeDailyTask(repository, plannedKind, today);
      setAnswered([{ questionId: question.id, correct: null, durationSeconds: seconds }]); setFinished(true);
    });
  }} />;

  return <section className="exercise-runner"><header><h1>{mode === 'exam' ? '模拟考试' : '专项练习'}</h1><b>{index + 1} / {questions.length}</b></header>{translationRequired && <QuestionTranslationGate key={question.id} question={question as ObjectiveQuestionType} repository={repository} onUnlocked={() => setTranslationUnlocked(true)} />}<ObjectiveQuestion question={question as ObjectiveQuestionType} value={response} disabled={Boolean(result) || (translationRequired && !translationUnlocked)} onChange={setResponse} />{translationRequired && !translationUnlocked && <p className="answer-lock-note">完成上方翻译后才能选择答案。</p>}{answerError && <p role="alert" className="answer-error">{answerError}</p>}{saveState !== 'idle' && <p role={saveState === 'error' ? 'alert' : 'status'}>{saveState === 'saving' ? '正在保存…' : saveState === 'saved' ? '已保存到本机；登录云端账户后可跨设备同步' : '保存失败，请重新保存后继续'}</p>}{saveState === 'error' && <button type="button" onClick={retrySave}>重新保存</button>}{!result ? <button className="primary-action" disabled={translationRequired && !translationUnlocked} onClick={submit}>提交答案</button> : <>{mode === 'practice' && <ExplanationPanel question={question} correct={result.correct} onReason={saveState === 'saved' ? saveReason : undefined} selectedReason={selectedReason} />}{saveState !== 'saving' && <button className="primary-action" disabled={saveState !== 'saved'} onClick={() => void next()}>{index >= questions.length - 1 ? '查看结果' : '下一题'}</button>}</>}</section>;
}

export function PracticeRoute() {
  const { kind } = useParams();
  if (!practiceKinds.includes(kind as PracticeKind)) return <p>未找到该练习类型。</p>;
  return <ExerciseRunner key={kind} kind={kind as PracticeKind} />;
}
