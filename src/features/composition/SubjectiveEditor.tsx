import { useEffect, useMemo, useState } from 'react';
import type { SubjectiveQuestion } from '../../domain/content';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import { evaluateSubjective, type SubjectiveFeedback } from './evaluateSubjective';
import { countEnglishWords, validateSubjectiveSubmission } from './validateSubjectiveSubmission';

const defaultRepository = new DexieLearningRepository();
function persistentId(key: string) {
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

export function SubjectiveEditor({ question, kind, repository = defaultRepository, onSubmit }: { question: SubjectiveQuestion; kind: 'writing' | 'translation'; repository?: LearningRepository; onSubmit?: (body: string, feedback: SubjectiveFeedback) => void }) {
  const storageKey = `draft:${question.id}`;
  const [body, setBody] = useState(() => localStorage.getItem(storageKey) ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem(storageKey, body);
      void repository.saveDraft({ id: persistentId(`${storageKey}:id`), questionId: question.id, body, deviceId: persistentId('cet4:device-id'), updatedAt: new Date().toISOString() }).catch(() => undefined);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [body, question.id, repository, storageKey]);
  const count = useMemo(() => countEnglishWords(body), [body]);
  const keywords = useMemo(() => [...new Set(question.referenceAnswer.toLowerCase().match(/[a-z]{5,}/g) ?? [])].slice(0, 4), [question.referenceAnswer]);
  const feedback = useMemo(() => evaluateSubjective(kind, body, keywords), [body, kind, keywords]);
  return <section className="subjective-editor">
    <header><h1>{kind === 'writing' ? '写作练习' : '翻译练习'}</h1><span>{count} 词</span></header>
    <p>{question.prompt}</p>
    <label>{kind === 'writing' ? '写作答题区' : '翻译答题区'}<textarea aria-label={kind === 'writing' ? '写作答题区' : '翻译答题区'} value={body} onChange={(event) => { setBody(event.target.value); setValidationError(''); }} /></label>
    <p>{kind === 'writing' ? '至少完成 80 个英文单词后才会记录任务完成。' : '至少完成 15 个英文单词并添加结尾标点后才会记录任务完成。'}</p>
    <button onClick={() => { const validation = validateSubjectiveSubmission(kind, body); if (!validation.valid) { setValidationError(validation.message); return; } setValidationError(''); setSubmitted(true); onSubmit?.(body, feedback); }}>提交自查</button>
    {validationError && <p role="alert">{validationError}</p>}
    {submitted && <section><h2>针对性修改建议</h2><ul>{feedback.checks.map((item) => <li key={item.label}><strong>{item.passed ? '✓' : '待改'} {item.label}</strong>：{item.passed ? '已达到基础要求。' : item.suggestion}</li>)}</ul><p>{feedback.disclaimer}</p><h2>自查清单</h2><ul>{question.rubric.map((item) => <li key={item}>{item}</li>)}</ul><h2>参考答案</h2><p>{question.referenceAnswer}</p></section>}
  </section>;
}
