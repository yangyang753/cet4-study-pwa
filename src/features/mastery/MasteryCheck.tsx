import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getPracticeItems, getQuestion } from '../../content/catalog';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { CatalogQuestion, ObjectiveQuestion as ObjectiveQuestionType, PracticeKind } from '../../domain/content';
import type { StudyKind } from '../planner/planDay';
import { gradeAnswer } from '../practice/gradeAnswer';
import { ObjectiveQuestion } from '../practice/ObjectiveQuestion';
import { localStudyDate } from './taskProgress';
import './mastery.css';

const defaultRepository = new DexieLearningRepository();
const masteryQuestionKind: Record<StudyKind, PracticeKind> = {
  vocabulary: 'vocabulary', listening: 'listening', reading: 'reading',
  translation: 'grammar', writing: 'grammar', review: 'vocabulary', mock: 'reading',
};

export function selectMasteryQuestions(kind: StudyKind, sourceQuestionIds: string[] = []) {
  const sourceQuestions = sourceQuestionIds.map(getQuestion).filter((question): question is CatalogQuestion => Boolean(question));
  const knowledgePointIds = new Set(sourceQuestions.flatMap((question) => question.knowledgePointIds));
  const objectiveSource = sourceQuestions.filter((question) => 'options' in question) as Array<CatalogQuestion & ObjectiveQuestionType>;
  const catalog = getPracticeItems(masteryQuestionKind[kind]).filter((question) => 'options' in question) as Array<CatalogQuestion & ObjectiveQuestionType>;
  const related = catalog.filter((question) => question.knowledgePointIds.some((id) => knowledgePointIds.has(id)));
  const unique = [...objectiveSource, ...related, ...catalog].filter((question, index, items) => items.findIndex((item) => item.id === question.id) === index);
  return unique.slice(0, 2);
}

export function MasteryCheck({ kind, taskId, repository = defaultRepository, now = new Date().toISOString(), sourceQuestionIds = [] }: { kind: StudyKind; taskId: string; repository?: LearningRepository; now?: string; sourceQuestionIds?: string[] }) {
  const questionIdsKey = sourceQuestionIds.join('|');
  const questions = useMemo(() => selectMasteryQuestions(kind, questionIdsKey ? questionIdsKey.split('|') : []), [kind, questionIdsKey]);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [results, setResults] = useState<boolean[]>([]);
  const [answerResult, setAnswerResult] = useState<boolean | null>(null);
  const [finished, setFinished] = useState<'mastered' | 'review' | null>(null);
  const [saving, setSaving] = useState(false);
  const question = questions[index];

  const submit = async () => {
    if (!question || !response || saving) return;
    setSaving(true);
    const graded = gradeAnswer(question, response);
    const nextResults = [...results, graded.correct];
    await repository.saveAttemptOnce({
      id: crypto.randomUUID(), userId: 'local-learner', questionId: question.id, response,
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
      const status = nextResults.every(Boolean) ? 'mastered' : 'review';
      await repository.upsertKnowledgeState({ id: `mastery:${taskId}`, itemId: taskId, status, favorite: false, updatedAt: now });
      setFinished(status);
    }
    setSaving(false);
  };

  if (!question) return <p>暂时无法生成掌握检测题。</p>;
  if (finished) return <section className={`mastery-result ${finished}`}><h1>{finished === 'mastered' ? '已完全掌握' : '需要继续复习'}</h1><p>{finished === 'mastered' ? '两题全部答对，今日任务已真正掌握。' : '检测中还有薄弱点，错题已自动加入复习安排。'}</p><a href={`${import.meta.env.BASE_URL}today`}>返回今日计划</a></section>;

  return <section className="mastery-check"><header><span>掌握度检测</span><h1>完成后再确认：你真的掌握了吗？</h1><p>共 2 题，必须全部答对才算完全掌握。</p><b>{index + 1} / 2</b></header><ObjectiveQuestion question={question} value={response} disabled={answerResult !== null || saving} onChange={setResponse} />{answerResult !== null && <p role="status" className={answerResult ? 'correct' : 'incorrect'}>{answerResult ? '回答正确' : `回答错误。${question.explanationZh}`}</p>}{answerResult === null ? <button className="primary-action" disabled={!response || saving} onClick={() => void submit()}>{index === questions.length - 1 ? '完成检测' : '提交答案'}</button> : index < questions.length - 1 && <button className="primary-action" onClick={() => { setIndex((value) => value + 1); setResponse(''); setAnswerResult(null); }}>下一题</button>}</section>;
}

export function MasteryRoute() {
  const { kind = 'vocabulary' } = useParams();
  const [params] = useSearchParams();
  const safeKind = (Object.keys(masteryQuestionKind).includes(kind) ? kind : 'vocabulary') as StudyKind;
  const taskId = params.get('taskId') ?? `${localStudyDate()}:${safeKind}`;
  return <MasteryCheck kind={safeKind} taskId={taskId} />;
}
