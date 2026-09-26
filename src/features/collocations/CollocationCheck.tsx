import { useMemo, useState } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { KnowledgeState } from '../../domain/learning';
import { applyKnowledgeReviewResult } from '../mastery/knowledgeMastery';
import { ObjectiveQuestion } from '../practice/ObjectiveQuestion';
import { gradeAnswer } from '../practice/gradeAnswer';
import { buildCollocationQuestion, collocationReviewCard, type CollocationEntry } from './collocationPractice';

export function CollocationCheck({ repository, entries, allEntries = entries, states, now = new Date().toISOString(), onComplete }: {
  repository: LearningRepository;
  entries: CollocationEntry[];
  allEntries?: CollocationEntry[];
  states: KnowledgeState[];
  now?: string;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [testing, setTesting] = useState(false);
  const [response, setResponse] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const item = entries[index];
  const question = useMemo(() => item ? buildCollocationQuestion(item, allEntries) : null, [allEntries, item]);

  async function submit() {
    if (!item || !question || !response || saving) return;
    const graded = gradeAnswer(question, response);
    const current = states.find((state) => state.itemId === item.id);
    const next = applyKnowledgeReviewResult(current, item.id, graded.correct, now);
    setSaving(true); setError('');
    try {
      await repository.saveAttemptOnce({
        id: crypto.randomUUID(), userId: 'local-learner', questionId: question.id, response,
        correct: graded.correct, score: graded.score, durationSeconds: 0, contentVersion: 'v1',
        kind: 'vocabulary', mode: 'mastery', deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device', createdAt: now,
      });
      await repository.upsertKnowledgeState(next);
      await repository.upsertReviewCard(collocationReviewCard(item.id, next.reviewStage ?? 0, graded.correct ? next.nextReviewAt ?? now : now, graded.correct, now));
      setResult(graded.correct);
    } catch {
      setError('搭配检测保存失败，答案已保留，请重新提交。');
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (index >= entries.length - 1) { onComplete(); return; }
    setIndex((value) => value + 1); setRevealed(false); setTesting(false); setResponse(''); setResult(null); setError('');
  }

  if (!item || !question) return <section className="vocabulary-warmup complete"><h1>今日重点搭配已完成</h1><button className="primary-action" onClick={onComplete}>继续训练</button></section>;
  if (!testing) return <section className="vocabulary-warmup collocation-warmup"><header><span>重点搭配 · {index + 1}/{entries.length}</span><h1>单词之后学习重点搭配</h1><p>先整体记忆搭配，再通过测试自动更新掌握状态。</p></header><article className="warmup-card"><h2>{item.phrase}</h2>{!revealed ? <button className="primary-action" onClick={() => setRevealed(true)}>显示搭配释义</button> : <div className="warmup-answer"><strong>{item.meaningZh}</strong><p>{item.example}</p><p>{item.exampleZh}</p><button className="primary-action" onClick={() => setTesting(true)}>开始搭配测试</button></div>}</article></section>;

  return <section className="exercise-runner collocation-check"><header><h1>重点搭配检测</h1><b>{index + 1} / {entries.length}</b></header><ObjectiveQuestion question={question} value={response} disabled={result !== null || saving} onChange={setResponse} />{error && <p role="alert">{error}</p>}{result !== null && <p role="status" className={result ? 'correct' : 'incorrect'}>{result ? '本次检测通过，已进入间隔巩固。' : `回答错误，已重新加入待复习。${question.explanationZh}`}</p>}{result === null ? <button className="primary-action" disabled={!response || saving} onClick={() => void submit()}>{saving ? '正在保存…' : '提交搭配答案'}</button> : <button className="primary-action" onClick={next}>{index >= entries.length - 1 ? '完成重点搭配' : '下一个重点搭配'}</button>}</section>;
}

