import { useMemo, useState } from 'react';
import rawContent from '../../content/starter/content.json';
import { parseContentPack } from '../../content/schema';
import type { ObjectiveQuestion as ObjectiveQuestionType } from '../../domain/content';
import { ExplanationPanel } from './ExplanationPanel';
import { gradeAnswer, type GradeResult } from './gradeAnswer';
import { ObjectiveQuestion } from './ObjectiveQuestion';
import './practice.css';

const starterContent = parseContentPack(rawContent);

export function ExerciseRunner({ setId, mode = 'practice' }: { setId: string; mode?: 'practice' | 'exam' }) {
  const practiceSet = starterContent.practiceSets.find((set) => set.id === setId);
  const questions = useMemo(() => practiceSet?.questionIds.map((id) => starterContent.questions.find((question) => question.id === id)!).filter(Boolean) ?? [], [practiceSet]);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);
  const question = questions[index];
  if (!question) return <p>未找到这组练习。</p>;
  if (!('options' in question)) return <section><h1>{question.type === 'writing' ? '写作练习' : '翻译练习'}</h1><p>{question.prompt}</p></section>;

  function submit() { setResult(gradeAnswer(question as ObjectiveQuestionType, response)); }
  function next() { setIndex((value) => Math.min(value + 1, questions.length - 1)); setResponse(''); setResult(null); }

  return <section className="exercise-runner"><header><span>{mode === 'exam' ? '模拟考试' : '专项练习'}</span><b>{index + 1} / {questions.length}</b></header><ObjectiveQuestion question={question as ObjectiveQuestionType} value={response} disabled={Boolean(result)} onChange={setResponse} />{!result ? <button className="primary-action" onClick={submit}>提交答案</button> : <><ExplanationPanel question={question} correct={result.correct} /><button className="primary-action" onClick={next}>下一题</button></>}</section>;
}
