import { useEffect, useMemo, useState } from 'react';
import { getPracticeItems } from '../../content/catalog';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { CatalogQuestion, ObjectiveQuestion as ObjectiveQuestionType, PracticeKind, SubjectiveQuestion } from '../../domain/content';
import { publicAssetUrl } from '../../lib/publicAssetUrl';
import { SubjectiveEditor } from '../composition/SubjectiveEditor';
import type { SubjectiveFeedback } from '../composition/evaluateSubjective';
import type { CoreStudyKind } from '../dashboard/learningEvidence';
import { ObjectiveQuestion } from '../practice/ObjectiveQuestion';
import { gradeAnswer } from '../practice/gradeAnswer';
import { scoreDiagnostic, selectDiagnosticWeakSkill, type DiagnosticResult } from './diagnostic';
import { createDiagnosticSession, DIAGNOSTIC_SESSION_KEY, restoreDiagnosticSession, type DiagnosticSessionAnswer, type DiagnosticSessionV2 } from './diagnosticSession';

const defaultRepository = new DexieLearningRepository();
const objectiveKinds: Array<Extract<PracticeKind, CoreStudyKind>> = ['vocabulary', 'grammar', 'listening', 'reading'];
const labels: Record<CoreStudyKind, string> = { vocabulary: '词汇', grammar: '语法', listening: '听力', reading: '阅读', writing: '写作', translation: '翻译' };
export type DiagnosticQuestion = CatalogQuestion & { diagnosticKind: CoreStudyKind };

function deviceId() {
  const existing = localStorage.getItem('cet4:device-id');
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem('cet4:device-id', created);
  return created;
}

function adHocSession(questions: DiagnosticQuestion[], timestamp: string): DiagnosticSessionV2 {
  const kinds = { vocabulary: 0, grammar: 0, listening: 0, reading: 0, writing: 0, translation: 0 } satisfies Record<CoreStudyKind, number>;
  for (const question of questions) kinds[question.diagnosticKind] += 1;
  return { version: 2, sessionId: crypto.randomUUID(), date: timestamp.slice(0, 10), questionIds: questions.map((item) => item.id), kinds, currentIndex: 0, answers: [], startedAt: timestamp, updatedAt: timestamp };
}

export function DiagnosticPage({ repository = defaultRepository, now = () => new Date().toISOString(), questions: suppliedQuestions }: { repository?: LearningRepository; now?: () => string; questions?: DiagnosticQuestion[] }) {
  const sourceQuestions = useMemo<DiagnosticQuestion[]>(() => suppliedQuestions ?? [
    ...objectiveKinds.flatMap((kind) => getPracticeItems(kind).map((item) => ({ ...item, diagnosticKind: kind }))),
    ...getPracticeItems('writing').map((item) => ({ ...item, diagnosticKind: 'writing' as const })),
    ...getPracticeItems('translation').map((item) => ({ ...item, diagnosticKind: 'translation' as const })),
  ], [suppliedQuestions]);
  const initial = useMemo(() => {
    const restored = restoreDiagnosticSession(localStorage.getItem(DIAGNOSTIC_SESSION_KEY), sourceQuestions);
    if (restored) return { session: restored, resume: true, setupError: '' };
    try {
      const timestamp = now();
      return { session: suppliedQuestions ? adHocSession(suppliedQuestions, timestamp) : createDiagnosticSession(sourceQuestions, crypto.randomUUID(), timestamp.slice(0, 10), timestamp), resume: false, setupError: '' };
    } catch (error) {
      return { session: null, resume: false, setupError: error instanceof Error ? error.message : '诊断题库暂不可用。' };
    }
  }, [now, sourceQuestions, suppliedQuestions]);
  const [session, setSession] = useState<DiagnosticSessionV2 | null>(initial.session);
  const [resumePrompt, setResumePrompt] = useState(initial.resume);
  const [response, setResponse] = useState('');
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [audioError, setAudioError] = useState(false);
  const questionById = useMemo(() => new Map(sourceQuestions.map((item) => [item.id, item])), [sourceQuestions]);
  const question = session ? questionById.get(session.questionIds[session.currentIndex]) : undefined;

  useEffect(() => {
    if (session && !result) localStorage.setItem(DIAGNOSTIC_SESSION_KEY, JSON.stringify(session));
  }, [result, session]);

  const restart = () => {
    const timestamp = now();
    try {
      const next = suppliedQuestions ? adHocSession(suppliedQuestions, timestamp) : createDiagnosticSession(sourceQuestions, crypto.randomUUID(), timestamp.slice(0, 10), timestamp);
      localStorage.setItem(DIAGNOSTIC_SESSION_KEY, JSON.stringify(next));
      setSession(next); setResumePrompt(false); setResponse(''); setSaveError(''); setAudioError(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '诊断题库暂不可用。');
    }
  };

  async function persistAnswer(answer: DiagnosticSessionAnswer) {
    if (!session || !question || saving) return;
    const stagedAnswers = [...session.answers.filter((item) => item.questionId !== answer.questionId), answer];
    const stagedSession = { ...session, answers: stagedAnswers, updatedAt: now() };
    setSession(stagedSession);
    setSaving(true); setSaveError('');
    try {
      await repository.saveAttemptOnce({
        id: answer.attemptId, userId: 'local-learner', questionId: question.id, response: answer.response,
        correct: answer.correct, score: answer.score, durationSeconds: 0, contentVersion: 'v1', kind: answer.kind,
        mode: 'diagnostic', deviceId: deviceId(), createdAt: now(),
      });
      if (session.currentIndex < session.questionIds.length - 1) {
        setSession({ ...stagedSession, currentIndex: session.currentIndex + 1, updatedAt: now() });
        setResponse(''); setAudioError(false);
        return;
      }
      const profile = scoreDiagnostic(stagedAnswers, now(), session.sessionId);
      const snapshot = await repository.getDashboardSnapshot();
      await repository.saveUserSettings({ ...snapshot.settings, diagnosticCompletedAt: profile.completedAt, diagnosticLevels: profile.levels, diagnosticProfile: profile, updatedAt: profile.completedAt });
      localStorage.removeItem(DIAGNOSTIC_SESSION_KEY);
      setResult(profile);
    } catch {
      setSaveError('诊断答案保存失败，当前答案已保留，请重试。');
    } finally {
      setSaving(false);
    }
  }

  const submitObjective = () => {
    if (!question || !('options' in question) || !response || !session) return;
    const graded = gradeAnswer(question as ObjectiveQuestionType, response);
    const existing = session.answers.find((item) => item.questionId === question.id);
    void persistAnswer({ questionId: question.id, kind: question.diagnosticKind, response, correct: graded.correct, score: graded.score, attemptId: existing?.attemptId ?? crypto.randomUUID() });
  };

  const submitSubjective = (body: string, feedback: SubjectiveFeedback) => {
    if (!question || 'options' in question || !session) return;
    const existing = session.answers.find((item) => item.questionId === question.id);
    void persistAnswer({ questionId: question.id, kind: question.diagnosticKind, response: body, correct: feedback.passed, score: feedback.score, attemptId: existing?.attemptId ?? crypto.randomUUID() });
  };

  if (result) {
    const weakSkill = selectDiagnosticWeakSkill(result.levels) ?? result.weakSkills[0];
    return <section><h1 tabIndex={-1}>基础诊断已完成</h1><p>结果已用于安排学习计划；参考区间不是官方成绩。</p><p><strong>预计 {result.estimatedScore} 分</strong>（{result.scoreRange.low}～{result.scoreRange.high}）</p><ul>{Object.entries(result.levels).map(([kind, level]) => <li key={kind}>{labels[kind as CoreStudyKind]}：{Math.round(level * 100)}%</li>)}</ul>{weakSkill && <p><strong>优先加强：{labels[weakSkill]}</strong></p>}<a href={`${import.meta.env.BASE_URL}today`}>查看今日计划</a></section>;
  }
  if (resumePrompt) return <section><h1>继续上次诊断</h1><p>已保存 {session?.answers.length ?? 0} / {session?.questionIds.length ?? 0} 项。</p><button className="primary-action" onClick={() => setResumePrompt(false)}>继续上次诊断</button><button onClick={restart}>重新开始诊断</button></section>;
  if (!session || !question) return <section><h1>暂时无法生成基础诊断</h1><p role="alert">{saveError || initial.setupError || '请稍后重试。'}</p><button onClick={restart}>重新生成</button></section>;

  const finalQuestion = session.currentIndex === session.questionIds.length - 1;
  return <section className="practice-runner">
    <header><span>20～30 分钟 · 综合诊断</span><h1>先测试，再按弱项学习</h1><p>共 {session.questionIds.length} 项，结果用于参考估分和今日计划。</p><b>{session.currentIndex + 1} / {session.questionIds.length}</b></header>
    {'audioSrc' in question && question.audioSrc && <><audio aria-label="诊断听力音频" controls preload="metadata" src={publicAssetUrl(question.audioSrc)} onError={() => setAudioError(true)} />{audioError && <p role="alert">音频加载失败，请检查网络后点击播放器重试；本题尚未判错。</p>}</>}
    {'options' in question
      ? <><ObjectiveQuestion question={question as ObjectiveQuestionType} value={response} disabled={saving} onChange={setResponse} /><button className="primary-action" disabled={!response || saving} onClick={submitObjective}>{saving ? '正在保存…' : saveError ? finalQuestion ? '重新保存并完成' : '重新保存并继续' : finalQuestion ? '完成诊断' : '保存并下一题'}</button></>
      : <SubjectiveEditor key={question.id} question={question as SubjectiveQuestion} kind={question.type} repository={repository} onSubmit={submitSubjective} revealFeedback={false} />}
    {saveError && <p role="alert">{saveError}</p>}<a href={`${import.meta.env.BASE_URL}today`}>稍后进行</a>
  </section>;
}
