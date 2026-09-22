import { useEffect, useState } from 'react';

function words(text: string) { return text.toLowerCase().replace(/[^a-z0-9'\s]/g, '').split(/\s+/).filter(Boolean); }

export function DictationEditor({ transcript, storageKey }: { transcript: string; storageKey: string }) {
  const [value, setValue] = useState(() => localStorage.getItem(storageKey) ?? '');
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => localStorage.setItem(storageKey, value), 500); return () => window.clearTimeout(timer); }, [storageKey, value]);
  const expected = words(transcript);
  const actual = words(value);
  const matched = expected.filter((word, index) => actual[index] === word).length;
  return <section className="dictation"><h2>听写练习</h2><textarea aria-label="听写输入" value={value} onChange={(event) => setValue(event.target.value)} placeholder="听到什么就写什么，不必一次写完整……" /><button onClick={() => setSubmitted(true)}>提交听写并对照</button>{submitted && <p>逐词匹配：{matched} / {expected.length}</p>}</section>;
}
