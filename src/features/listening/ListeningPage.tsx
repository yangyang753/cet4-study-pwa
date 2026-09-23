import { useMemo, useRef, useState } from 'react';
import listeningSets from '../../../content/v1/listeningSets.json';
import type { AudioAsset } from '../../domain/content';
import { publicAssetUrl } from '../../lib/publicAssetUrl';
import { DictationEditor } from './DictationEditor';
import { useSegmentPlayer } from './useSegmentPlayer';
import './listening.css';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import { getQuestion } from '../../content/catalog';

type PlayerStatus = 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'error';

const statusCopy: Record<PlayerStatus, string> = {
  loading: '正在加载音频…', ready: '可以播放', playing: '正在播放',
  paused: '已暂停', buffering: '缓冲中…', error: '播放遇到问题',
};

const typeCopy = { news: '短篇新闻', conversation: '长对话', passage: '听力篇章' } as const;

const defaultRepository = new DexieLearningRepository();

function ListeningExercise({ setIndex, onSetIndexChange, repository }: { setIndex: number; onSetIndexChange: (index: number) => void; repository: LearningRepository }) {
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
  const player = useSegmentPlayer(audio);
  const [showTranscript, setShowTranscript] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [selected, setSelected] = useState('');
  const [answerError, setAnswerError] = useState('');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [submissionState, setSubmissionState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [startedAt] = useState(() => Date.now());
  const submissionLock = useRef(false);

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
        id: crypto.randomUUID(), userId: 'local-learner', deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device',
        questionId: catalogQuestion?.id ?? `${listeningSet.id}:q${questionIndex + 1}`, contentVersion: 'v1', kind: 'listening', mode: 'practice',
        response: selected, correct, score: correct ? 1 : 0,
        durationSeconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)), createdAt: now.toISOString(),
      });
      if (!correct) await repository.upsertReviewCard({
        id: `review:${listeningSet.id}:q${questionIndex + 1}`,
        questionId: catalogQuestion?.id ?? `${listeningSet.id}:q${questionIndex + 1}`,
        stage: 0, nextReviewAt: now.toISOString(), lastCorrect: false, updatedAt: now.toISOString(),
      });
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
    submissionLock.current = false;
  };

  return <section className="listening-page">
    <header className="listening-heading">
      <div><h1>听力精练</h1><p>慢一点、再听一遍，直到真正听懂。</p></div>
      <div className="set-navigation" aria-label="听力题组导航">
        <button disabled={setIndex === 0} onClick={() => changeSet(setIndex - 1)}>上一套</button>
        <strong>第 {setIndex + 1} / {listeningSets.length} 套</strong>
        <button disabled={setIndex === listeningSets.length - 1} onClick={() => changeSet(setIndex + 1)}>下一套</button>
      </div>
    </header>
    <div className="listening-grid"><div>
      <section className="audio-player">
        <span>{typeCopy[listeningSet.type as keyof typeof typeCopy]} · {listeningSet.theme}</span>
        <h2>{listeningSet.themeEn}</h2>
        <div className="wave" aria-hidden="true">{Array.from({ length: 32 }, (_, index) => <i key={index} style={{ height: `${20 + (index * 17) % 54}px` }} />)}</div>
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
        <p className={`player-status status-${status}`} aria-live="polite">{statusCopy[status]}</p>
        <div className="controls">
          <button onClick={() => void play()}>播放</button><button onClick={player.pause}>暂停</button>
          <button onClick={player.previous}>上一句</button><button aria-pressed={player.looping} onClick={player.loopSegment}>单句循环</button><button onClick={player.next}>下一句</button>
          <label>播放速度<select value={String(player.rate)} onChange={(event) => player.setRate(Number(event.target.value))}>{[0.75, 1, 1.25, 1.5].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}</select></label>
        </div>
      </section>
      {mediaError && <div role="alert" className="media-error">{mediaError}<button onClick={retry}>重试</button><button onClick={() => setShowTranscript(true)}>文本模式</button></div>}
      <section className="transcript"><button onClick={() => setShowTranscript((value) => !value)}>{showTranscript ? '隐藏原文' : '显示原文'}</button>{showTranscript && audio.segments.map((segment, index) => <p key={segment.id} className={player.segmentIndex === index ? 'active' : ''} onClick={() => player.selectSegment(index)}>{segment.text}</p>)}</section>
      <DictationEditor transcript={audio.transcript} storageKey={`dictation:${listeningSet.id}`} />
    </div><aside className="listening-question">
      <span>QUESTION · {questionIndex + 1}/{listeningSet.questions.length}</span><h2>{question.prompt}</h2>
      {question.options.map((option, index) => { const optionId = String.fromCharCode(65 + index); return <label key={optionId}><input type="radio" name={`${listeningSet.id}:${questionIndex}`} checked={selected === optionId} disabled={Boolean(result)} onChange={() => setSelected(optionId)} />{optionId}. {option}</label>; })}
      {!result && <button disabled={submissionState === 'saving'} onClick={() => void submit()}>{submissionState === 'saving' ? '正在保存…' : '提交答案'}</button>}
      {answerError && <p role="alert" className="answer-error">{answerError}</p>}
      {result && <div className={`answer-result ${result}`} role="status"><strong>{result === 'correct' ? '回答正确' : '回答错误'}</strong><p>正确答案：{String.fromCharCode(65 + question.answer)}</p><p>解析：{question.explanationZh}</p>{questionIndex < listeningSet.questions.length - 1 ? <button onClick={nextQuestion}>下一题</button> : <p>本套完成</p>}</div>}
      {submissionState === 'error' && <p role="alert">保存失败，答案仍保留，请再次提交。</p>}
    </aside></div>
  </section>;
}

export function ListeningPage({ repository = defaultRepository }: { repository?: LearningRepository }) {
  const [setIndex, setSetIndex] = useState(0);
  return <ListeningExercise key={listeningSets[setIndex].id} setIndex={setIndex} onSetIndexChange={setSetIndex} repository={repository} />;
}
