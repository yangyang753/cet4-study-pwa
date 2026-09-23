import { useEffect, useMemo } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { ExamSessionRecord } from '../../domain/exam';
import type { ResolvedExam } from './examBlueprint';
import { summarizeExam } from './summarizeExam';

const sectionNames = { writing: '写作', listening: '听力', reading: '阅读', translation: '翻译' } as const;
const percent = (value: number | null) => value === null ? '—' : `${Math.round(value * 100)}%`;

export function ExamResult({ session, exam, repository }: { session: ExamSessionRecord; exam: ResolvedExam; repository: LearningRepository }) {
  const summary = useMemo(() => summarizeExam(session, exam), [exam, session]);
  useEffect(() => {
    if (session.status !== 'submitted') return;
    const reviewedAt = session.submittedAt ?? session.updatedAt;
    summary.wrongQuestions.forEach((question) => { void repository.upsertReviewCard({ id: `exam-review:${session.id}:${question.id}`, questionId: question.id, stage: 0, nextReviewAt: reviewedAt, lastCorrect: false, updatedAt: reviewedAt }); });
  }, [repository, session, summary.wrongQuestions]);
  if (session.status !== 'submitted') return <p>完成交卷后才能查看分析。</p>;
  const subjective = exam.sections.flatMap((section) => section.questions).filter((question) => !('correctAnswer' in question));
  return <section className="exam-result">
    <header><span>MOCK EXAM REPORT</span><h1>模考分析</h1><p>已完成 {summary.answered}/{summary.total} 题 · 用时 {Math.floor(summary.elapsedSeconds / 60)} 分钟</p></header>
    <h2>分项完成情况</h2><div className="exam-result-grid">{Object.entries(summary.sections).map(([kind, item]) => <article key={kind}><strong>{sectionNames[kind as keyof typeof sectionNames]}</strong><b>{Math.round(item.completion * 100)}%</b><small>客观题正确率 {percent(item.accuracy)}</small></article>)}</div>
    <section><h2>薄弱知识点</h2>{summary.weakKnowledgePoints.length ? <ul>{summary.weakKnowledgePoints.map((point) => <li key={point}>{point}</li>)}</ul> : <p>暂无足够的客观题错题数据。</p>}</section>
    <section><h2>错题解析</h2>{summary.wrongQuestions.length ? summary.wrongQuestions.map((question) => <details key={question.id}><summary>{question.prompt}</summary><p><strong>正确答案：</strong>{'correctAnswer' in question ? String(question.correctAnswer) : ''}</p><p>{question.explanationZh}</p></details>) : <p>本次没有已作答的客观错题。</p>}</section>
    <section><h2>主观题自查</h2>{subjective.map((question) => <article key={question.id} className="subjective-check"><h3>{question.type === 'writing' ? '写作' : '翻译'}</h3><ul>{'rubric' in question && question.rubric.map((item) => <li key={item}>{item}</li>)}</ul><details><summary>查看参考答案</summary><p>{'referenceAnswer' in question ? question.referenceAnswer : ''}</p></details></article>)}</section>
    {summary.unansweredQuestionIds.length > 0 && <p className="exam-warning">有 {summary.unansweredQuestionIds.length} 题未作答，建议在错题复习中补练。</p>}
  </section>;
}
