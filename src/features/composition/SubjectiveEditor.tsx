import { useEffect, useMemo, useState } from 'react';
import type { SubjectiveQuestion } from '../../domain/content';

function countEnglishWords(value: string) { return value.trim() ? value.trim().split(/\s+/).length : 0; }
function countChineseCharacters(value: string) { return (value.match(/[\u3400-\u9fff]/g) ?? []).length; }

export function SubjectiveEditor({ question, kind }: { question: SubjectiveQuestion; kind: 'writing' | 'translation' }) {
  const storageKey = `draft:${question.id}`;
  const [body, setBody] = useState(() => localStorage.getItem(storageKey) ?? '');
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => localStorage.setItem(storageKey, body), 2000); return () => window.clearTimeout(timer); }, [body, storageKey]);
  const count = useMemo(() => kind === 'writing' ? countEnglishWords(body) : countChineseCharacters(body), [body, kind]);
  return <section className="subjective-editor"><header><h1>{kind === 'writing' ? '写作练习' : '翻译练习'}</h1><span>{count} {kind === 'writing' ? '词' : '个汉字'}</span></header><p>{question.prompt}</p><label>{kind === 'writing' ? '写作答题区' : '翻译答题区'}<textarea aria-label={kind === 'writing' ? '写作答题区' : '翻译答题区'} value={body} onChange={(event) => setBody(event.target.value)} /></label><button onClick={() => setSubmitted(true)}>提交自查</button>{submitted && <section><h2>自查清单</h2><ul>{question.rubric.map((item) => <li key={item}>{item}</li>)}</ul><h2>参考答案</h2><p>{question.referenceAnswer}</p></section>}</section>;
}
