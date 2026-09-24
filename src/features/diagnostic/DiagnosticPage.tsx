import { useMemo, useState } from 'react';
import { getPracticeItems } from '../../content/catalog';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { ObjectiveQuestion as ObjectiveQuestionType, PracticeKind } from '../../domain/content';
import { ObjectiveQuestion } from '../practice/ObjectiveQuestion';
import { gradeAnswer } from '../practice/gradeAnswer';
import type { CoreStudyKind } from '../dashboard/learningEvidence';
import { scoreDiagnostic, type DiagnosticResponse } from './diagnostic';

const defaultRepository = new DexieLearningRepository();
const diagnosticKinds: Array<Extract<PracticeKind, CoreStudyKind>> = ['vocabulary', 'grammar', 'listening', 'reading'];

export function DiagnosticPage({ repository = defaultRepository, now = () => new Date().toISOString() }: { repository?: LearningRepository; now?: () => string }) {
  const questions = useMemo(() => diagnosticKinds.flatMap((kind) => getPracticeItems(kind).filter((item) => 'options' in item).slice(0, 3).map((item) => ({ ...item, diagnosticKind: kind }))), []);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [answers, setAnswers] = useState<DiagnosticResponse[]>([]);
  const [finished, setFinished] = useState(false);
  const question = questions[index];

  const submit = async () => {
    if (!question || !response) return;
    const graded = gradeAnswer(question as ObjectiveQuestionType, response);
    const next = [...answers, { questionId: question.id, kind: question.diagnosticKind, correct: graded.correct }];
    if (index < questions.length - 1) { setAnswers(next); setIndex((value) => value + 1); setResponse(''); return; }
    const result = scoreDiagnostic(next, now());
    const snapshot = await repository.getDashboardSnapshot();
    await repository.saveUserSettings({ ...snapshot.settings, diagnosticCompletedAt: result.completedAt, diagnosticLevels: result.levels, updatedAt: result.completedAt });
    setFinished(true);
  };

  if (finished) return <section><h1 tabIndex={-1}>基础诊断已完成</h1><p>结果已用于安排第一周学习计划，不代表官方 CET-4 分数。</p><a href={`${import.meta.env.BASE_URL}today`}>查看今日计划</a></section>;
  if (!question) return <p>暂时无法生成基础诊断。</p>;
  return <section className="practice-runner"><header><span>10～15 分钟 · 基础诊断</span><h1>先了解目前的基础</h1><p>共 12 题，可稍后再做，不影响使用其他功能。</p><b>{index + 1} / {questions.length}</b></header><ObjectiveQuestion question={question as ObjectiveQuestionType} value={response} disabled={false} onChange={setResponse} /><button className="primary-action" disabled={!response} onClick={() => void submit()}>{index === questions.length - 1 ? '完成诊断' : '下一题'}</button><a href={`${import.meta.env.BASE_URL}today`}>稍后进行</a></section>;
}
