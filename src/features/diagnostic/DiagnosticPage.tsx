import { useMemo, useState } from 'react';
import { getPracticeItems } from '../../content/catalog';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { CatalogQuestion, ObjectiveQuestion as ObjectiveQuestionType, PracticeKind } from '../../domain/content';
import { publicAssetUrl } from '../../lib/publicAssetUrl';
import { ObjectiveQuestion } from '../practice/ObjectiveQuestion';
import { gradeAnswer } from '../practice/gradeAnswer';
import type { CoreStudyKind } from '../dashboard/learningEvidence';
import { scoreDiagnostic, selectDiagnosticWeakSkill, type DiagnosticResponse, type DiagnosticResult } from './diagnostic';

const defaultRepository = new DexieLearningRepository();
const diagnosticKinds: Array<Extract<PracticeKind, CoreStudyKind>> = ['vocabulary', 'grammar', 'listening', 'reading'];
type DiagnosticQuestion = CatalogQuestion & { diagnosticKind: CoreStudyKind };

export function DiagnosticPage({ repository = defaultRepository, now = () => new Date().toISOString(), questions: suppliedQuestions }: { repository?: LearningRepository; now?: () => string; questions?: DiagnosticQuestion[] }) {
  const generatedQuestions = useMemo(() => diagnosticKinds.flatMap((kind) => getPracticeItems(kind).filter((item) => 'options' in item).slice(0, 3).map((item) => ({ ...item, diagnosticKind: kind }))), []);
  const questions = suppliedQuestions ?? generatedQuestions;
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [answers, setAnswers] = useState<DiagnosticResponse[]>([]);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const question = questions[index];

  const submit = async () => {
    if (!question || !response) return;
    const graded = gradeAnswer(question as ObjectiveQuestionType, response);
    const next = [...answers, { questionId: question.id, kind: question.diagnosticKind, correct: graded.correct }];
    if (index < questions.length - 1) { setAnswers(next); setIndex((value) => value + 1); setResponse(''); return; }
    const result = scoreDiagnostic(next, now());
    const snapshot = await repository.getDashboardSnapshot();
    await repository.saveUserSettings({ ...snapshot.settings, diagnosticCompletedAt: result.completedAt, diagnosticLevels: result.levels, updatedAt: result.completedAt });
    setResult(result);
  };

  if (result) {
    const labels: Record<CoreStudyKind, string> = { vocabulary: '词汇', grammar: '语法', listening: '听力', reading: '阅读', writing: '写作', translation: '翻译' };
    const weakSkill = selectDiagnosticWeakSkill(result.levels);
    return <section><h1 tabIndex={-1}>基础诊断已完成</h1><p>结果已用于安排第一周学习计划，不代表官方 CET-4 分数。</p><ul>{Object.entries(result.levels).map(([kind, level]) => <li key={kind}>{labels[kind as CoreStudyKind]}：{Math.round(level * 100)}%</li>)}</ul>{weakSkill && <p><strong>优先加强：{labels[weakSkill]}</strong></p>}<a href={`${import.meta.env.BASE_URL}today`}>查看今日计划</a></section>;
  }
  if (!question) return <p>暂时无法生成基础诊断。</p>;
  return <section className="practice-runner">
    <header><span>10～15 分钟 · 基础诊断</span><h1>先了解目前的基础</h1><p>共 {questions.length} 题，可稍后再做，不影响使用其他功能。</p><b>{index + 1} / {questions.length}</b></header>
    {'audioSrc' in question && question.audioSrc && <audio aria-label="诊断听力音频" controls preload="metadata" src={publicAssetUrl(question.audioSrc)} />}
    <ObjectiveQuestion question={question as ObjectiveQuestionType} value={response} disabled={false} onChange={setResponse} />
    <button className="primary-action" disabled={!response} onClick={() => void submit()}>{index === questions.length - 1 ? '完成诊断' : '下一题'}</button><a href={`${import.meta.env.BASE_URL}today`}>稍后进行</a>
  </section>;
}
