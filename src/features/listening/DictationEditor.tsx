import { useEffect, useState } from 'react';
import { evaluateDictation } from './dictationEvaluation';

export function DictationEditor({ transcript, storageKey }: { transcript: string; storageKey: string }) {
  const [value, setValue] = useState(() => localStorage.getItem(storageKey) ?? '');
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => localStorage.setItem(storageKey, value), 500); return () => window.clearTimeout(timer); }, [storageKey, value]);
  const evaluation = evaluateDictation(transcript, value);
  return <section className="dictation"><header><div><span>DICTATION · 听写复盘</span><h2>听写练习</h2></div>{submitted && <strong>{evaluation.accuracy}%</strong>}</header><p>漏一个词不会拖累后面整句；系统会按顺序自动对齐。</p><textarea aria-label="听写输入" value={value} onChange={(event) => { setValue(event.target.value); setSubmitted(false); }} placeholder="听到什么就写什么，不必一次写完整……" /><button onClick={() => setSubmitted(true)}>提交听写并对照</button>{submitted && <div className="dictation-result" role="status"><p><b>正确 {evaluation.matched}</b> / 共 {evaluation.total} 词</p><div className="dictation-diff" aria-label="听写对照">{evaluation.tokens.map((token, index) => <span key={`${token.word}:${index}`} className={token.status}>{token.word}</span>)}</div><p>漏听：{evaluation.missing.length ? evaluation.missing.join('、') : '无'} · 多写：{evaluation.extra.length ? evaluation.extra.join('、') : '无'}</p></div>}</section>;
}
