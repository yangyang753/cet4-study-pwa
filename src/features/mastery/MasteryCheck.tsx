import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getPracticeItems, getQuestion } from '../../content/catalog';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { CatalogQuestion, ObjectiveQuestion as ObjectiveQuestionType, PracticeKind, SubjectiveQuestion } from '../../domain/content';
import type { StudyKind } from '../planner/planDay';
import { gradeAnswer } from '../practice/gradeAnswer';
import { ObjectiveQuestion } from '../practice/ObjectiveQuestion';
import { decodeMasteryContext } from './masteryContext';
import { recordMasteryOutcome } from './taskProgress';
import { SubjectiveMasteryCheck } from './SubjectiveMasteryCheck';
import './mastery.css';

const defaultRepository = new DexieLearningRepository();
const masteryQuestionKind: Record<StudyKind, PracticeKind> = {
  vocabulary: 'vocabulary', grammar: 'grammar', listening: 'listening', reading: 'reading',
  translation: 'grammar', writing: 'grammar', review: 'vocabulary', mock: 'reading',
};

export function selectMasteryQuestions(kind: StudyKind, sourceQuestionIds: string[] = []) {
  if (kind === 'writing' || kind === 'translation') return [];
  const sourceQuestions = sourceQuestionIds.map(getQuestion).filter((question): question is CatalogQuestion => Boolean(question));
  const knowledgePointIds = new Set(sourceQuestions.flatMap((question) => question.knowledgePointIds));
  const objectiveSource = sourceQuestions.filter((question) => 'options' in question) as Array<CatalogQuestion & ObjectiveQuestionType>;
  const catalog = getPracticeItems(masteryQuestionKind[kind]).filter((question) => 'options' in question) as Array<CatalogQuestion & ObjectiveQuestionType>;
  const related = catalog.filter((question) => question.knowledgePointIds.some((id) => knowledgePointIds.has(id)));
  const unique = [...objectiveSource, ...related, ...catalog].filter((question, index, items) => items.findIndex((item) => item.id === question.id) === index);
  return unique.slice(0, 3);
}

function ObjectiveMasteryCheck({ kind, taskId, repository, now, sourceQuestionIds }: { kind: StudyKind; taskId: string; repository: LearningRepository; now: string; sourceQuestionIds: string[] }) {
  const questionIdsKey = sourceQuestionIds.join('|');
  const questions = useMemo(() => selectMasteryQuestions(kind, questionIdsKey ? questionIdsKey.split('|') : []), [kind, questionIdsKey]);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [results, setResults] = useState<boolean[]>([]);
  const [answerResult, setAnswerResult] = useState<boolean | null>(null);
  const [finished, setFinished] = useState<'mastered' | 'review' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [attemptId, setAttemptId] = useState('');
  const question = questions[index];

  const submit = async () => {
    if (!question || !response || saving) return;
    setSaving(true);
    setSaveError('');
    const graded = gradeAnswer(question, response);
    const nextResults = [...results, graded.correct];
    const stableAttemptId = attemptId || crypto.randomUUID();
    if (!attemptId) setAttemptId(stableAttemptId);
    try {
      await repository.saveAttemptOnce({
        id: stableAttemptId, userId: 'local-learner', questionId: question.id, response,
        correct: graded.correct, score: graded.score, durationSeconds: 0, contentVersion: 'v1',
        kind, mode: 'mastery', deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device', createdAt: now,
      });
      if (!graded.correct) await repository.upsertReviewCard({
        id: `review:${question.id}`, questionId: question.id, stage: 0,
        nextReviewAt: now, lastCorrect: false, updatedAt: now,
      });
      setResults(nextResults);
      setAnswerResult(graded.correct);
      if (index === questions.length - 1) {
        const outcome = await recordMasteryOutcome(repository, taskId, nextResults.filter(Boolean).length, questions.length, now);
        setFinished(outcome === 'mastered' ? 'mastered' : 'review');
      }
    } catch {
      setSaveError('保存失败，答案已保留，请重新保存本题。');
    } finally {
      setSaving(false);
    }
  };

  if (!question) return <p>暂时无法生成掌握检测题。</p>;
  if (finished) return <section className={`mastery-result ${finished}`}><h1>{finished === 'mastered' ? '已完全掌握' : '需要继续复习'}</h1><p>{finished === 'mastered' ? '检测正确率达到 80%，今日任务已真正掌握。' : '检测中还有薄弱点，错题已自动加入复习安排。'}</p><a href={`${import.meta.env.BASE_URL}today`}>返回今日计划</a></section>;

  return <section className="mastery-check"><header><span>掌握度检测</span><h1>完成后再确认：你真的掌握了吗？</h1><p>{sourceQuestionIds.length ? '题目优先来自本次练习内容。' : '题目来自当前学习类别。'}达到 80% 才算掌握。</p><b>{index + 1} / {questions.length}</b></header><ObjectiveQuestion question={question} value={response} disabled={answerResult !== null || saving} onChange={setResponse} />{answerResult !== null && <p role="status" className={answerResult ? 'correct' : 'incorrect'}>{answerResult ? '回答正确' : `回答错误。${question.explanationZh}`}</p>}{saveError && <p role="alert">{saveError}</p>}{answerResult === null ? <button className="primary-action" disabled={!response || saving} onClick={() => void submit()}>{saveError ? '重新保存本题' : index === questions.length - 1 ? '完成检测' : '提交答案'}</button> : index < questions.length - 1 && <button className="primary-action" onClick={() => { setIndex((value) => value + 1); setResponse(''); setAnswerResult(null); setAttemptId(''); setSaveError(''); }}>下一题</button>}</section>;
}

export function MasteryCheck({ kind, taskId, repository = defaultRepository, now = new Date().toISOString(), sourceQuestionIds = [] }: { kind: StudyKind; taskId: string; repository?: LearningRepository; now?: string; sourceQuestionIds?: string[] }) {
  if (kind === 'writing' || kind === 'translation') {
    const sourced = sourceQuestionIds.map(getQuestion).find((question): question is CatalogQuestion & SubjectiveQuestion => Boolean(question && !('options' in question)));
    const fallback = getPracticeItems(kind).find((question): question is CatalogQuestion & SubjectiveQuestion => !('options' in question));
    const question = sourced ?? fallback;
    return question ? <SubjectiveMasteryCheck kind={kind} taskId={taskId} question={question} repository={repository} now={now} /> : <p>暂时无法生成掌握检测题。</p>;
  }
  return <ObjectiveMasteryCheck kind={kind} taskId={taskId} repository={repository} now={now} sourceQuestionIds={sourceQuestionIds} />;
}

export function MasteryRoute() {
  const { kind = 'vocabulary' } = useParams();
  const [params] = useSearchParams();
  const context = decodeMasteryContext(params, kind);
  return <MasteryCheck kind={context.kind} taskId={context.taskId} sourceQuestionIds={context.sourceQuestionIds} />;
}
