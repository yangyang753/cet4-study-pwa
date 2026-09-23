import { useMemo, useState } from 'react';
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

const starterContent = parseContentPack(rawContent);
const defaultRepository = new DexieLearningRepository();
const practiceKinds: PracticeKind[] = ['vocabulary', 'grammar', 'listening', 'reading', 'translation', 'writing'];
interface AnsweredItem { questionId: string; correct: boolean | null; durationSeconds: number }

export function ExerciseRunner({ setId, kind, limit = 5, mode = 'practice', repository = defaultRepository, userId = 'local-learner', today = localStudyDate() }: { setId?: string; kind?: PracticeKind; limit?: number; mode?: 'practice' | 'exam'; repository?: LearningRepository; userId?: string; today?: string }) {
  const questions = useMemo<Question[]>(() => {
    if (kind) return getPracticeItems(kind).slice(0, limit);
    const practiceSet = starterContent.practiceSets.find((set) => set.id === setId);
    return practiceSet?.questionIds.map((id) => starterContent.questions.find((question) => question.id === id)!).filter(Boolean) ?? [];
  }, [kind, limit, setId]);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [answerError, setAnswerError] = useState('');
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [answered, setAnswered] = useState<AnsweredItem[]>([]);
  const [finished, setFinished] = useState(false);
  const question = questions[index];
  const plannedKind = kind === 'grammar' ? null : kind;

  if (!question) return <p>未找到这组练习。</p>;
  if (finished) {
    const correct = answered.filter((item) => item.correct).length;
    const durationSeconds = answered.reduce((sum, item) => sum + item.durationSeconds, 0);
    return <section className="practice-summary"><h1>练习完成</h1><p>完成 {answered.length} 题，答对 {correct} 题，用时 {durationSeconds} 秒。</p><p>错题 {answered.filter((item) => item.correct === false).length} 道，已经加入复习安排。</p>{plannedKind && mode === 'practice' && <MasteryCheck kind={plannedKind} taskId={`${today}:${plannedKind}`} repository={repository} />}</section>;
  }

  const duration = () => Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  const baseAttempt = (responseValue: unknown, correct: boolean | null, score: number | null) => ({
    id: crypto.randomUUID(), userId, questionId: question.id, response: responseValue, correct, score,
    durationSeconds: duration(), contentVersion: 'v1', kind: kind ?? question.type, mode,
    deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device', createdAt: new Date().toISOString(),
  });

  function submit() {
    if (!response) { setAnswerError('请选择一个答案'); return; }
    const graded = gradeAnswer(question as ObjectiveQuestionType, response);
    setAnswerError(''); setResult(graded); setSaveState('saving');
    const seconds = duration();
    void repository.saveAttemptOnce(baseAttempt(response, graded.correct, graded.score)).then(() => {
      setAnswered((items) => [...items, { questionId: question.id, correct: graded.correct, durationSeconds: seconds }]);
      setSaveState('saved');
    }).catch(() => setSaveState('error'));
  }

  async function next() {
    if (index >= questions.length - 1) {
      if (plannedKind && mode === 'practice') await completeDailyTask(repository, plannedKind, today);
      setFinished(true); return;
    }
    setIndex((value) => value + 1);
    setResponse(''); setResult(null); setSaveState('idle'); setAnswerError(''); setStartedAt(Date.now());
  }

  if (!('options' in question)) return <SubjectiveEditor question={question} kind={question.type} repository={repository} onSubmit={(body) => {
    const seconds = duration();
    void repository.saveAttemptOnce(baseAttempt(body, null, null)).then(async () => {
      if (plannedKind && mode === 'practice') await completeDailyTask(repository, plannedKind, today);
      setAnswered([{ questionId: question.id, correct: null, durationSeconds: seconds }]); setFinished(true);
    });
  }} />;

  return <section className="exercise-runner"><header><span>{mode === 'exam' ? '模拟考试' : '专项练习'}</span><b>{index + 1} / {questions.length}</b></header><ObjectiveQuestion question={question as ObjectiveQuestionType} value={response} disabled={Boolean(result)} onChange={setResponse} />{answerError && <p role="alert" className="answer-error">{answerError}</p>}{saveState !== 'idle' && <p role="status">{saveState === 'saving' ? '正在保存…' : saveState === 'saved' ? '已保存到本机，联网后自动同步' : '保存失败，请重试本题'}</p>}{!result ? <button className="primary-action" onClick={submit}>提交答案</button> : <>{mode === 'practice' && <ExplanationPanel question={question} correct={result.correct} />}<button className="primary-action" onClick={() => void next()}>{index >= questions.length - 1 ? '查看结果' : '下一题'}</button></>}</section>;
}

export function PracticeRoute() {
  const { kind } = useParams();
  if (!practiceKinds.includes(kind as PracticeKind)) return <p>未找到该练习类型。</p>;
  return <ExerciseRunner kind={kind as PracticeKind} />;
}
