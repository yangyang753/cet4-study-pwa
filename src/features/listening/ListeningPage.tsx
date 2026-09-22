import { useState } from 'react';
import rawContent from '../../content/starter/content.json';
import { parseContentPack } from '../../content/schema';
import { DictationEditor } from './DictationEditor';
import { useSegmentPlayer } from './useSegmentPlayer';
import './listening.css';

const content = parseContentPack(rawContent);
const audio = content.audioAssets[0];
const question = content.questions.find((item) => item.id === 'q-conversation');

export function ListeningPage() {
  const player = useSegmentPlayer(audio);
  const [showTranscript, setShowTranscript] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [selected, setSelected] = useState('');
  if (!question || !('options' in question)) return <p>听力内容暂不可用。</p>;
  return <section className="listening-page"><header><h1>听力精练</h1><p>慢一点、再听一遍，直到真正听懂。</p></header><div className="listening-grid"><div><section className="audio-player"><span>长对话 · 校园生活</span><h2>Planning a Volunteer Activity</h2><div className="wave" aria-hidden="true">{Array.from({ length: 32 }, (_, index) => <i key={index} style={{ height: `${20 + (index * 17) % 54}px` }} />)}</div><audio ref={player.mediaRef} src={audio.src} onTimeUpdate={player.onTimeUpdate} onError={() => setMediaError(true)} /><div className="controls"><button onClick={() => void player.play()}>播放</button><button onClick={player.pause}>暂停</button><button onClick={player.previous}>上一句</button><button aria-pressed={player.looping} onClick={player.loopSegment}>单句循环</button><button onClick={player.next}>下一句</button><label>播放速度<select value={String(player.rate)} onChange={(event) => player.setRate(Number(event.target.value))}>{[0.75, 1, 1.25, 1.5].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}</select></label></div></section>{mediaError && <div role="alert" className="media-error">音频加载失败，当前答案已保留。<button onClick={() => { setMediaError(false); player.mediaRef.current?.load(); }}>重试</button><button onClick={() => setShowTranscript(true)}>文本模式</button></div>}<section className="transcript"><button onClick={() => setShowTranscript((value) => !value)}>{showTranscript ? '隐藏原文' : '显示原文'}</button>{showTranscript && audio.segments.map((segment, index) => <p key={segment.id} className={player.segmentIndex === index ? 'active' : ''} onClick={() => player.selectSegment(index)}>{segment.text}</p>)}</section><DictationEditor transcript={audio.transcript} storageKey="dictation:audio-starter" /></div><aside className="listening-question"><span>QUESTION</span><h2>{question.prompt}</h2>{question.options.map((option) => <label key={option.id}><input type="radio" name={question.id} checked={selected === option.id} onChange={() => setSelected(option.id)} />{option.id}. {option.text}</label>)}<button>提交答案</button><p>提示：重点捕捉 but 和 actually 后的信息。</p></aside></div></section>;
}
