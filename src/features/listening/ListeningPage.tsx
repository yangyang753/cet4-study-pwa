import { useEffect, useMemo, useRef, useState } from 'react';
import listeningSets from '../../../content/v1/listeningSets.json';
import type { AudioAsset, ObjectiveQuestion } from '../../domain/content';
import { publicAssetUrl } from '../../lib/publicAssetUrl';
import { createId } from '../../lib/createId';
import { DictationEditor } from './DictationEditor';
import { ListeningFoundationDrill } from './ListeningFoundationDrill';
import { useSegmentPlayer } from './useSegmentPlayer';
import './listening.css';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import { getQuestion } from '../../content/catalog';
import { completeDailyTask, localStudyDate } from '../mastery/taskProgress';
import { MasteryCheck } from '../mastery/MasteryCheck';
import { QuestionTranslationGate, questionNeedsTranslation } from '../translation/QuestionTranslationGate';
import { cacheListeningAudio } from './cacheListeningAudio';

type PlayerStatus = 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'error';

const statusCopy: Record<PlayerStatus, string> = {
  loading: '正在加载音频…', ready: '可以播放', playing: '正在播放',
  paused: '已暂停', buffering: '缓冲中…', error: '播放遇到问题',
};

const typeCopy = { news: '短篇新闻', conversation: '长对话', passage: '听力篇章' } as const;

const defaultRepository = new DexieLearningRepository();

function ListeningExercise({ setIndex, onSetIndexChange, repository, today, playbackRate }: { setIndex: number; onSetIndexChange: (index: number) => void; repository: LearningRepository; today: string; playbackRate: number }) {
  const listeningSet = listeningSets[setIndex];
  const [questionIndex, setQuestionIndex] = useState(0);
  const question = listeningSet.questions[questionIndex];
  const audio = useMemo<AudioAsset>(() => ({
    id: listeningSet.id,
    src: publicAssetUrl(listeningSet.audioSrc),
    durationSeconds: listeningSet.segments.at(-1)?.end ?? 0,
    transcript: listeningSet.transcript,
    segments: listeningSet.segments.map((segment, index) => ({ ...segment, id: `${listeningSet.id}-segment-${index + 1}` })),
  }), [listeningSet]);
  const player = useSegmentPlayer(audio, playbackRate);
  const [showTranscript, setShowTranscript] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [selected, setSelected] = useState('');
  const [answerError, setAnswerError] = useState('');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [submissionState, setSubmissionState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [translationUnlocked, setTranslationUnlocked] = useState(false);
  const [offlineState, setOfflineState] = useState<'idle' | 'downloading' | 'cached' | 'error'>('idle');
  const [offlineMessage, setOfflineMessage] = useState('');
  const [initialStartedAt] = useState(() => Date.now());
  const [initialAttemptId] = useState(() => createId());
  const questionStartedAt = useRef(initialStartedAt);
  const attemptId = useRef(initialAttemptId);
  const submissionLock = useRef(false);
  const translationQuestion: ObjectiveQuestion = {
    id: `${listeningSet.id}:q${questionIndex + 1}`,
    version: 1,
    type: listeningSet.type as ObjectiveQuestion['type'],
    difficulty: 'foundation',
    prompt: question.prompt,
    options: question.options.map((text, index) => ({ id: String.fromCharCode(65 + index), text })),
    correctAnswer: String.fromCharCode(65 + question.answer),
    knowledgePointIds: [],
    explanationZh: question.explanationZh,
    sourceNote: '原创仿真听力训练',
  };
  const translationRequired = questionNeedsTranslation(translationQuestion);

  const changeSet = (nextIndex: number) => {
    player.pause();
    onSetIndexChange(nextIndex);
  };

  const play = async () => {
    setMediaError('');
    try {
      await player.play();
    } catch {
      setStatus('error');
      setMediaError('浏览器未能开始播放，请重试或使用文本模式。');
    }
  };

  const retry = () => {
    setMediaError('');
    setStatus('loading');
    player.mediaRef.current?.load();
  };

  const playSegment = (index: number) => {
    player.selectSegment(index);
    player.setRate(0.75);
    void play();
  };

  const downloadOffline = async () => {
    if (offlineState === 'downloading' || offlineState === 'cached') return;
    setOfflineState('downloading');
    setOfflineMessage('正在下载本套音频，请保持页面打开…');
    try {
      const result = await cacheListeningAudio(audio.src);
      setOfflineState('cached');
      setOfflineMessage(result === 'already-cached' ? '本套已在离线缓存中' : '本套已可离线播放');
    } catch {
      setOfflineState('error');
      setOfflineMessage('离线下载失败，可能是网络中断或手机存储空间不足，请稍后重试。');
    }
  };

  const submit = async () => {
    if (!selected) { setAnswerError('请选择一个答案'); return; }
    if (submissionLock.current) return;
    submissionLock.current = true;
    setAnswerError('');
    setSubmissionState('saving');
    const correctAnswer = String.fromCharCode(65 + question.answer);
    const correct = selected === correctAnswer;
    const now = new Date();
    const catalogQuestion = getQuestion(`${listeningSet.id}:q${questionIndex + 1}`);
    try {
      await repository.saveAttemptOnce({
        id: attemptId.current, userId: 'local-learner', deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device',
        questionId: catalogQuestion?.id ?? `${listeningSet.id}:q${questionIndex + 1}`, contentVersion: 'v1', kind: 'listening', mode: 'practice',
        response: selected, correct, score: correct ? 1 : 0,
        durationSeconds: Math.max(0, Math.round((Date.now() - questionStartedAt.current) / 1000)), createdAt: now.toISOString(),
      });
      if (!correct) await repository.upsertReviewCard({
        id: `review:${listeningSet.id}:q${questionIndex + 1}`,
        questionId: catalogQuestion?.id ?? `${listeningSet.id}:q${questionIndex + 1}`,
        stage: 0, nextReviewAt: now.toISOString(), lastCorrect: false, updatedAt: now.toISOString(),
      });
      if (questionIndex === listeningSet.questions.length - 1) await completeDailyTask(repository, 'listening', today);
      setResult(correct ? 'correct' : 'incorrect');
      setSubmissionState('saved');
    } catch {
      submissionLock.current = false;
      setSubmissionState('error');
    }
  };

  const nextQuestion = () => {
    if (questionIndex >= listeningSet.questions.length - 1) return;
    setQuestionIndex((value) => value + 1);
    setSelected('');
    setResult(null);
    setSubmissionState('idle');
    setTranslationUnlocked(false);
    submissionLock.current = false;
    questionStartedAt.current = Date.now();
    attemptId.current = createId();
  };

  const completionPercent = Math.round((questionIndex / listeningSet.questions.length) * 100);
  const currentStage = result ? 4 : translationUnlocked || !translationRequired ? 3 : 2;

  return <section className="listening-page">
    <header className="listening-heading">
      <div><span className="listening-eyebrow">LISTENING LAB · 听力训练舱</span><h1>听力精练</h1><p>从辨音、定位到复盘，把每一套材料真正听懂。</p></div>
      <div className="set-navigation" aria-label="听力题组导航">
        <button disabled={setIndex === 0} onClick={() => changeSet(setIndex - 1)}>上一套</button>
        <strong>第 {setIndex + 1} / {listeningSets.length} 套</strong>
        <button disabled={setIndex === listeningSets.length - 1} onClick={() => changeSet(setIndex + 1)}>下一套</button>
      </div>
    </header>
    <section className="listening-progress" aria-label="本组训练进度">
      <div><span>题组 </span><strong>{setIndex + 1} / {listeningSets.length}</strong></div>
      <div><span>题目 </span><strong>{questionIndex + 1} / {listeningSet.questions.length}</strong></div>
      <div><span>材料类型</span><strong>{typeCopy[listeningSet.type as keyof typeof typeCopy]}</strong></div>
      <div><span>训练模式</span><strong>逐句精听</strong></div>
      <span className="progress-track" aria-hidden="true"><i style={{ width: `${completionPercent}%` }} /></span>
    </section>
    <details className="listening-basis"><summary>训练依据与使用方法</summary><p>题型结构依据教育部教育考试院公布的 CET4 考核内容：听力由短篇新闻、长对话和听力篇章组成。本应用材料均为原创仿真，不是历年官方真题；训练重点覆盖时间、转折、因果、主旨、态度与后续行动定位。</p><a href="https://cet.neea.edu.cn/html1/folder/16113/1586-1.htm" target="_blank" rel="noreferrer">查看 CET 官方笔试结构</a></details>
    <nav className="listening-stages" aria-label="听力训练步骤" tabIndex={0}>
      {['01 精听定位', '02 翻译解锁', '03 选择答案', '04 听写复盘'].map((stage, index) => <span key={stage} className={currentStage >= index + 1 ? 'active' : ''}>{stage}</span>)}
    </nav>
    <div className="listening-grid">
      <section className="audio-player">
        <div className="player-kicker"><span>{typeCopy[listeningSet.type as keyof typeof typeCopy]}</span><span>合成语音训练材料 · 原创仿真内容</span></div>
        <h2>{listeningSet.themeEn}</h2>
        <p className="audio-theme">{listeningSet.theme}</p>
        <section className="audio-timeline" aria-label="音频训练进度">
          <div className="wave" aria-hidden="true">{Array.from({ length: 36 }, (_, index) => <i key={index} className={index <= player.segmentIndex * 5 ? 'heard' : ''} style={{ height: `${18 + (index * 17) % 50}px` }} />)}</div>
          <div className="timeline-meta"><span>当前句 {player.segmentIndex + 1} / {audio.segments.length}</span><span>{Math.round(audio.durationSeconds)} 秒</span></div>
        </section>
        <audio
          ref={player.mediaRef}
          src={audio.src}
          preload="metadata"
          onLoadStart={() => setStatus('loading')}
          onWaiting={() => setStatus('buffering')}
          onCanPlay={() => { setStatus('ready'); setMediaError(''); }}
          onPlaying={() => setStatus('playing')}
          onPause={() => setStatus((current) => current === 'error' ? current : 'paused')}
          onTimeUpdate={player.onTimeUpdate}
          onError={() => { setStatus('error'); setMediaError('音频加载失败，当前答案已保留。'); }}
        />
        <div className="player-command-row">
          <p className={`player-status status-${status}`} aria-live="polite"><i />{statusCopy[status]}</p>
          <span>建议先盲听，再逐句定位关键词</span>
        </div>
        <div className="controls">
          <button className="primary-player-control" aria-label="播放" onClick={() => void play()}>▶ 播放</button><button onClick={player.pause}>暂停</button>
          <button onClick={player.previous}>← 上一句</button><button aria-pressed={player.looping} onClick={player.loopSegment}>↻ 单句循环</button><button onClick={player.next}>下一句 →</button>
          <label>播放速度<select value={String(player.rate)} onChange={(event) => player.setRate(Number(event.target.value))}>{[0.75, 1, 1.25, 1.5].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}</select></label>
        </div>
        <div className="offline-audio-row">
          <button disabled={offlineState === 'downloading' || offlineState === 'cached'} onClick={() => void downloadOffline()}>{offlineState === 'downloading' ? '正在下载…' : offlineState === 'cached' ? '本套已下载' : '下载本套离线'}</button>
          <span>仅下载当前一套，避免一次占用约 98 MB 手机空间。</span>
        </div>
        {offlineMessage && <p className={`offline-audio-message ${offlineState === 'error' ? 'error' : ''}`} role={offlineState === 'error' ? 'alert' : 'status'}>{offlineMessage}</p>}
        {mediaError && <div role="alert" className="media-error"><span>{mediaError}</span><button onClick={retry}>重试</button><button onClick={() => setShowTranscript(true)}>文本模式</button></div>}
      </section>
      <aside className="listening-question">
      <header className="question-header"><span>QUESTION · {questionIndex + 1}/{listeningSet.questions.length}</span><b>{typeCopy[listeningSet.type as keyof typeof typeCopy]}</b></header><h2>{question.prompt}</h2>
      {translationRequired && <QuestionTranslationGate key={translationQuestion.id} question={translationQuestion} repository={repository} onUnlocked={() => setTranslationUnlocked(true)} />}
      <div className="answer-options">{question.options.map((option, index) => { const optionId = String.fromCharCode(65 + index); return <label key={optionId} className={selected === optionId ? 'selected' : ''}><input type="radio" name={`${listeningSet.id}:${questionIndex}`} checked={selected === optionId} disabled={Boolean(result) || (translationRequired && !translationUnlocked)} onChange={() => setSelected(optionId)} /><strong>{optionId}</strong><span>{option}</span></label>; })}</div>
      {!result && <button className="submit-listening-answer" disabled={submissionState === 'saving' || (translationRequired && !translationUnlocked)} onClick={() => void submit()}>{submissionState === 'saving' ? '正在保存…' : translationRequired && !translationUnlocked ? '完成翻译后作答' : '提交答案'}</button>}
      {answerError && <p role="alert" className="answer-error">{answerError}</p>}
      {result && <div className={`answer-result ${result}`} role="status"><strong>{result === 'correct' ? '回答正确' : '回答错误'}</strong><p>正确答案：{String.fromCharCode(65 + question.answer)}</p><p>解析：{question.explanationZh}</p>{questionIndex < listeningSet.questions.length - 1 ? <button onClick={nextQuestion}>下一题</button> : <><p>本套完成，今日听力任务已自动记录。</p><MasteryCheck kind="listening" taskId={`${today}:listening`} repository={repository} sourceQuestionIds={listeningSet.questions.map((_, index) => `${listeningSet.id}:q${index + 1}`)} /></>}</div>}
      {submissionState === 'error' && <p role="alert">保存失败，答案仍保留，请再次提交。</p>}
      </aside>
      <ListeningFoundationDrill segments={audio.segments} repository={repository} onPlaySegment={playSegment} />
      <section className="transcript"><header><div><span>TRANSCRIPT</span><h2>逐句精听原文</h2></div><button onClick={() => setShowTranscript((value) => !value)}>{showTranscript ? '隐藏原文' : '显示原文'}</button></header>{showTranscript ? <div className="transcript-lines">{audio.segments.map((segment, index) => <p key={segment.id} className={player.segmentIndex === index ? 'active' : ''} onClick={() => player.selectSegment(index)}><b>{segment.speaker ? `${segment.speaker} · ${String(index + 1).padStart(2, '0')}` : String(index + 1).padStart(2, '0')}</b><span>{segment.text}</span></p>)}</div> : <p className="transcript-placeholder">先完成盲听；需要核对关键词时再展开原文。</p>}</section>
      <DictationEditor transcript={audio.transcript} storageKey={`dictation:${listeningSet.id}`} />
    </div>
  </section>;
}

export function ListeningPage({ repository = defaultRepository, today = localStudyDate() }: { repository?: LearningRepository; today?: string }) {
  const [setIndex, setSetIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  useEffect(() => {
    let active = true;
    void repository.getDashboardSnapshot().then((snapshot) => { if (active) setPlaybackRate(snapshot.settings.playbackRate); }).catch(() => undefined);
    return () => { active = false; };
  }, [repository]);
  return <ListeningExercise key={listeningSets[setIndex].id} setIndex={setIndex} onSetIndexChange={setSetIndex} repository={repository} today={today} playbackRate={playbackRate} />;
}
