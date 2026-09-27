import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogQuestion, ObjectiveQuestion } from '../../domain/content';
import type { ExamSessionRecord } from '../../domain/exam';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import { ObjectiveQuestion as ObjectiveQuestionView } from '../practice/ObjectiveQuestion';
import { resolveExam } from './examBlueprint';
import { createExamSession, reduceExamSession, remainingSeconds, restoreExamSession } from './examSessionReducer';
import { ExamResult } from './ExamResult';
import './exam.css';
import { completeDailyTask } from '../mastery/taskProgress';
import { MasteryCheck } from '../mastery/MasteryCheck';
import { studyDate } from '../../lib/studyDate';
import { publicAssetUrl } from '../../lib/publicAssetUrl';

const defaultRepository = new DexieLearningRepository();
const defaultNow = () => new Date().toISOString();
const sectionNames = { writing: '写作', listening: '听力', reading: '阅读', translation: '翻译' } as const;

function formatSeconds(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${hours ? `${hours}:` : ''}${String(minutes).padStart(hours ? 2 : 1, '0')}:${String(remainder).padStart(2, '0')}`;
}

function ExamListeningPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState('');

  async function play() {
    if (!audioRef.current || started) return;
    setError('');
    try {
      await audioRef.current.play();
      setStarted(true);
    } catch {
      setError('音频暂时无法播放，请检查网络或浏览器声音权限后重试。');
    }
  }

  return <section className="exam-listening-player">
    <audio ref={audioRef} aria-label="模考听力音频" preload="metadata" src={publicAssetUrl(src)} onEnded={() => setEnded(true)} onError={() => setError('音频加载失败，请重新加载后再播放。')}>您的浏览器不支持音频播放。</audio>
    <p>本组听力只完整播放一次，组内切题不会重新开始。</p>
    <button type="button" disabled={started} onClick={() => void play()}>{ended ? '本组播放完毕' : started ? '正在播放本组听力' : '播放本组听力（仅一次）'}</button>
    {error && <p role="alert">{error} <button type="button" onClick={() => { setError(''); audioRef.current?.load(); }}>重新加载音频</button></p>}
  </section>;
}

function QuestionView({ question, response, onChange }: { question: CatalogQuestion; response: string; onChange: (response: string) => void }) {
  if ('options' in question) {
    return <>
      {question.passage && <article className="exam-passage">{question.passage}</article>}
      <ObjectiveQuestionView question={question as ObjectiveQuestion} value={response} disabled={false} onChange={onChange} />
    </>;
  }
  return <label className="exam-subjective"><strong>{question.prompt}</strong><textarea aria-label={question.type === 'writing' ? '写作答题区' : '翻译答题区'} value={response} onChange={(event) => onChange(event.target.value)} placeholder="答案会自动保存在本机" /></label>;
}

export function ExamSession({ mockId = 'mock-1', repository = defaultRepository, now = defaultNow }: { mockId?: string; repository?: LearningRepository; now?: () => string }) {
  const exam = useMemo(() => resolveExam(mockId), [mockId]);
  const [session, setSession] = useState<ExamSessionRecord | null>(null);
  const [recovery, setRecovery] = useState<ExamSessionRecord | null>(null);
  const [clock, setClock] = useState(now);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saving');
  const sessionRef = useRef<ExamSessionRecord | null>(null);
  const finalWriteStarted = useRef(false);
  const saveSequence = useRef(0);

  const persistSession = useCallback(async (next: ExamSessionRecord) => {
    const sequence = ++saveSequence.current;
    setSaveState('saving');
    try {
      await repository.saveExamSession(next);
      if (sequence === saveSequence.current) setSaveState('saved');
      return true;
    } catch {
      if (sequence === saveSequence.current) setSaveState('error');
      return false;
    }
  }, [repository]);

  const updateSession = useCallback((next: ExamSessionRecord, persist = false) => {
    sessionRef.current = next;
    setSession(next);
    if (persist) void persistSession(next);
  }, [persistSession]);

  useEffect(() => {
    let active = true;
    void repository.getActiveExamSession().then((saved) => {
      if (!active) return;
      if (saved?.status === 'active' && saved.mockId === mockId) setRecovery(saved);
      else {
        const created = createExamSession(exam, now());
        updateSession(created, true);
      }
    });
    return () => { active = false; };
  }, [exam, mockId, now, repository, updateSession]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(now()), 1000);
    return () => window.clearInterval(timer);
  }, [now]);

  useEffect(() => {
    const current = sessionRef.current;
    if (current?.status !== 'active') return;
    const restored = restoreExamSession(current, exam, clock);
    if (restored !== current) {
      setQuestionIndex(0);
      if (restored.status === 'submitted') finalWriteStarted.current = true;
      updateSession(restored, true);
    }
  }, [clock, exam, updateSession]);

  useEffect(() => {
    const autosave = window.setInterval(() => {
      if (sessionRef.current?.status === 'active') void persistSession(sessionRef.current);
    }, 30_000);
    return () => window.clearInterval(autosave);
  }, [persistSession]);

  const continueSaved = () => {
    if (!recovery) return;
    const restored = restoreExamSession(recovery, exam, now());
    setRecovery(null);
    updateSession(restored, true);
  };
  const restart = () => {
    finalWriteStarted.current = false;
    const created = createExamSession(exam, now());
    setRecovery(null);
    updateSession(created, true);
  };

  if (recovery) return <section className="exam-recovery" role="dialog" aria-labelledby="recovery-title"><h1 id="recovery-title">继续上次模考</h1><p>检测到一场未完成的 {exam.title}，答案已保存在本机。</p><div><button className="primary-action" onClick={continueSaved}>继续考试</button><button onClick={restart}>重新开始</button></div></section>;
  if (!session) return <p>正在恢复模考…</p>;
  if (session.status === 'stale') return <section className="exam-notice"><h1>题库已更新</h1><p>这份旧模考记录已设为只读，请开始一套新试卷。</p><button onClick={restart}>开始新模考</button></section>;
  if (session.status === 'submitted') { const taskId = `${studyDate(new Date(session.submittedAt ?? now()))}:mock`; return <><ExamResult session={session} exam={exam} repository={repository} /><MasteryCheck kind="mock" taskId={taskId} repository={repository} sourceQuestionIds={Object.keys(session.answers)} /></>; }

  const section = exam.sections[session.currentSectionIndex];
  const question = section.questions[questionIndex];
  const seconds = remainingSeconds(session, clock);
  const answer = session.answers[question.id];
  const response = typeof answer === 'string' ? answer : '';
  const answered = Object.keys(session.answers).length;

  const saveAnswer = (value: string) => updateSession(reduceExamSession(session, { type: 'answer', questionId: question.id, response: value, now: now() }), true);
  const moveQuestion = async (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= section.questions.length) return;
    if (saveState === 'error' && !(await persistSession(session))) return;
    setQuestionIndex(nextIndex);
    void persistSession(session);
  };
  const submit = async () => {
    if (finalWriteStarted.current || !window.confirm('确认提前交卷吗？交卷后不能再修改答案。')) return;
    finalWriteStarted.current = true;
    const submittedAt = now();
    const submitted = reduceExamSession(session, { type: 'submit', now: submittedAt });
    if (!(await persistSession(submitted))) { finalWriteStarted.current = false; return; }
    updateSession(submitted);
    void completeDailyTask(repository, 'mock', studyDate(new Date(submittedAt)));
  };
  const nextSection = exam.sections[session.currentSectionIndex + 1];
  const advanceSection = () => {
    if (!nextSection || !window.confirm(`确认完成${sectionNames[section.kind]}并进入${sectionNames[nextSection.kind]}吗？进入后不能返回上一部分。`)) return;
    const advanced = reduceExamSession(session, { type: 'go-to-section', sectionIndex: session.currentSectionIndex + 1, now: now() });
    setQuestionIndex(0);
    updateSession(advanced, true);
  };
  const sharedTime = section.kind === 'reading' || section.kind === 'translation';
  const returnToReading = section.kind === 'translation' && !session.lockedSectionIndexes.includes(session.currentSectionIndex - 1);

  return <section className="exam-session">
    <header className="exam-header"><div><span>完整模拟 · 原创仿真</span><h1>{exam.title}</h1></div><div className="exam-timer"><small>全卷剩余</small><strong role="timer">{formatSeconds(seconds)}</strong></div></header>
    <nav className="exam-sections" aria-label="考试分区">{exam.sections.map((item, index) => <span key={item.kind} className={index === session.currentSectionIndex ? 'active' : ''} aria-current={index === session.currentSectionIndex ? 'step' : undefined}>{sectionNames[item.kind]} · {item.kind === 'reading' || item.kind === 'translation' ? '共用 70' : item.minutes} 分钟{session.lockedSectionIndexes.includes(index) ? ' · 已锁定' : ''}</span>)}</nav>
    <div className="exam-progress"><span>当前分区：{sectionNames[section.kind]}（{sharedTime ? '阅读与翻译共用 70' : section.minutes} 分钟）</span><span>本区 {questionIndex + 1}/{section.questions.length} · 全卷已答 {answered}/57</span></div>
    {section.kind === 'listening' && question.audioSrc && <ExamListeningPlayer key={question.groupId ?? question.audioSrc} src={question.audioSrc} />}
    <main className="exam-question"><QuestionView question={question} response={response} onChange={saveAnswer} /></main>
    <footer className="exam-actions"><button disabled={questionIndex === 0} onClick={() => void moveQuestion(questionIndex - 1)}>上一题</button><button disabled={questionIndex === section.questions.length - 1} onClick={() => void moveQuestion(questionIndex + 1)}>下一题</button>{returnToReading && <button className="section-action" onClick={() => { setQuestionIndex(0); updateSession(reduceExamSession(session, { type: 'go-to-section', sectionIndex: 2, now: now() }), true); }}>返回阅读</button>}{nextSection && <button className="section-action" onClick={advanceSection}>{section.kind === 'reading' ? '切换到翻译（可返回）' : `完成${sectionNames[section.kind]}并进入${sectionNames[nextSection.kind]}`}</button>}<button className="danger-action" onClick={() => void submit()}>交卷</button></footer>
    {saveState === 'error' ? <p className="exam-save-note" role="alert">保存失败，答案仍保留在当前页面。<button onClick={() => sessionRef.current && void persistSession(sessionRef.current)}>重新保存</button></p> : <p className="exam-save-note" role="status">{saveState === 'saving' ? '正在保存…' : '已保存'}；每次作答、切题及每 30 秒自动保存到本机。考试中不显示答案和解析。</p>}
  </section>;
}
