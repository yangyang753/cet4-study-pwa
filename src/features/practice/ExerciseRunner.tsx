import { useMemo, useState } from 'react';
import rawContent from '../../content/starter/content.json';
import { parseContentPack } from '../../content/schema';
import type { ObjectiveQuestion as ObjectiveQuestionType } from '../../domain/content';
import { ExplanationPanel } from './ExplanationPanel';
import { gradeAnswer, type GradeResult } from './gradeAnswer';
import { ObjectiveQuestion } from './ObjectiveQuestion';
import './practice.css';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';

const starterContent = parseContentPack(rawContent);
const defaultRepository = new DexieLearningRepository();

export function ExerciseRunner({ setId, mode = 'practice', repository = defaultRepository, userId = 'local-learner' }: { setId: string; mode?: 'practice' | 'exam'; repository?: LearningRepository; userId?: string }) {
  const practiceSet = starterContent.practiceSets.find((set) => set.id === setId);
  const questions = useMemo(() => practiceSet?.questionIds.map((id) => starterContent.questions.find((question) => question.id === id)!).filter(Boolean) ?? [], [practiceSet]);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const question = questions[index];
  if (!question) return <p>未找到这组练习。</p>;
  if (!('options' in question)) return <section><h1>{question.type === 'writing' ? '写作练习' : '翻译练习'}</h1><p>{question.prompt}</p></section>;

  function submit() {
    const graded = gradeAnswer(question as ObjectiveQuestionType, response);
    setResult(graded);
    setSaveState('saving');
    void repository.saveAttempt({ id: crypto.randomUUID(), userId, questionId: question.id, response, correct: graded.correct, score: graded.score, durationSeconds: 0, createdAt: new Date().toISOString() }).then(() => setSaveState('saved')).catch(() => setSaveState('error'));
  }
  function next() { setIndex((value) => Math.min(value + 1, questions.length - 1)); setResponse(''); setResult(null); setSaveState('idle'); }

  return <section className="exercise-runner"><header><span>{mode === 'exam' ? '模拟考试' : '专项练习'}</span><b>{index + 1} / {questions.length}</b></header><ObjectiveQuestion question={question as ObjectiveQuestionType} value={response} disabled={Boolean(result)} onChange={setResponse} />{saveState !== 'idle' && <p role="status">{saveState === 'saving' ? '正在保存…' : saveState === 'saved' ? '已保存到本机，联网后自动同步' : '保存失败，请重试本题'}</p>}{!result ? <button className="primary-action" onClick={submit}>提交答案</button> : <><ExplanationPanel question={question} correct={result.correct} /><button className="primary-action" onClick={next}>下一题</button></>}</section>;
}
