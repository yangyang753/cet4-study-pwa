import { useMemo, useState } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { learningVocabulary } from '../../content/vocabularyLearning';
import { vocabularyReviewCard } from '../vocabulary/wordMastery';
import { buildListeningCues, checkListeningCue } from './listeningFoundation';

export function ListeningFoundationDrill({
  segments,
  repository,
  onPlaySegment,
}: {
  segments: Array<{ text: string }>;
  repository: LearningRepository;
  onPlaySegment: (index: number) => void;
}) {
  const cues = useMemo(() => buildListeningCues(segments, learningVocabulary, 3), [segments]);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [completed, setCompleted] = useState(false);
  const cue = cues[index];

  if (!cue) return null;
  const submit = async () => {
    const correct = checkListeningCue(response, cue.answer);
    setResult(correct ? 'correct' : 'incorrect');
    if (!correct) await repository.upsertReviewCard(vocabularyReviewCard(cue.wordId, 'cloze', new Date().toISOString()));
  };
  const next = () => {
    if (index === cues.length - 1) { setCompleted(true); return; }
    setIndex((value) => value + 1);
    setResponse('');
    setResult(null);
  };

  return <section className="foundation-drill" aria-label="基础听力提升">
    <header><div><span>FOUNDATION BOOST · 基础补强</span><h2>先辨关键词，再做整题</h2></div><strong>{completed ? `${cues.length}/${cues.length}` : `${index + 1}/${cues.length}`}</strong></header>
    <div className="foundation-route"><span className="active">1 词义预热</span><span className={result ? 'active' : ''}>2 慢速辨词</span><span className={completed ? 'active' : ''}>3 回到整题</span></div>
    {completed ? <div className="foundation-complete" role="status"><b>本组关键词检测完成</b><p>把速度调回 1×，重新听完整材料，再完成右侧题目。错词已自动进入错题复习。</p></div> : <>
      <p className="foundation-tip">先看词义：<b>{cue.lemma}</b> · {cue.meaningZh}。建议用 0.75× 单句循环听 2—3 遍。</p>
      <button className="listen-cue-button" onClick={() => onPlaySegment(cue.segmentIndex)}>▶ 听本句</button>
      <div className="listening-cloze"><p>{cue.sentence}</p><label>填入听到的单词<input aria-label="填入听到的单词" value={response} disabled={Boolean(result)} autoComplete="off" onChange={(event) => setResponse(event.target.value)} /></label></div>
      {!result ? <button className="foundation-submit" disabled={!response.trim()} onClick={() => void submit()}>检查听辨</button> : <div className={`foundation-feedback ${result}`} role="status"><b>{result === 'correct' ? '听对了' : `漏听或拼写错误：${cue.answer}`}</b><p>{result === 'correct' ? '继续下一词，逐步恢复到正常速度。' : `这个词已自动加入错题复习；原形是 ${cue.lemma}。`}</p><button onClick={next}>{index === cues.length - 1 ? '完成基础训练' : '继续下一词'}</button></div>}
    </>}
  </section>;
}
