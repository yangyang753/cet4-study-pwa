import { useMemo, useState } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { KnowledgeState } from '../../domain/learning';
import { createId } from '../../lib/createId';
import { applyKnowledgeReviewResult } from '../mastery/knowledgeMastery';
import { buildCollocationRecallExercise, collocationReviewCard, gradeCollocationRecall, type CollocationEntry } from './collocationPractice';

export function CollocationCheck({ repository, entries, states, now = new Date().toISOString(), passedItemIds = [], random = Math.random, onItemPassed, onComplete }: {
  repository: LearningRepository;
  entries: CollocationEntry[];
  states: KnowledgeState[];
  now?: string;
  passedItemIds?: string[];
  random?: () => number;
  onItemPassed?: (itemId: string) => void | Promise<void>;
  onComplete: () => void;
}) {
  const [sessionEntries] = useState(() => entries.filter((entry) => !passedItemIds.includes(entry.id)));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [testing, setTesting] = useState(false);
  const [response, setResponse] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [localStates, setLocalStates] = useState(states);
  const item = sessionEntries[index];
  const exercise = useMemo(() => item ? buildCollocationRecallExercise(item, random) : null, [item, random]);

  async function submit() {
    if (!item || !exercise || !response.trim() || saving) return;
    const correct = gradeCollocationRecall(exercise, response);
    const current = localStates.find((state) => state.itemId === item.id);
    const next = applyKnowledgeReviewResult(current, item.id, correct, now);
    setSaving(true); setError('');
    try {
      await repository.saveAttemptOnce({
        id: createId(), userId: 'local-learner', questionId: `${item.id}:collocation`, response,
        correct, score: correct ? 1 : 0, durationSeconds: 0, contentVersion: 'v1',
        kind: 'collocation', mode: 'mastery', deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device', createdAt: now,
      });
      await repository.upsertKnowledgeState(next);
      setLocalStates((values) => [...values.filter((state) => state.itemId !== item.id), next]);
      await repository.upsertReviewCard(collocationReviewCard(item.id, next.reviewStage ?? 0, correct ? next.nextReviewAt ?? now : now, correct, now));
      if (correct) await onItemPassed?.(item.id);
      setResult(correct);
    } catch {
      setError('搭配检测保存失败，答案已保留，请重新提交。');
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (index >= sessionEntries.length - 1) { onComplete(); return; }
    setIndex((value) => value + 1); setRevealed(false); setTesting(false); setResponse(''); setResult(null); setError('');
  }

  function retry() {
    setResponse(''); setResult(null); setError('');
  }

  if (!item || !exercise) return <section className="vocabulary-warmup complete"><h1>今日重点搭配已完成</h1><button className="primary-action" onClick={onComplete}>完成训练</button></section>;
  if (!testing) return <section className="vocabulary-warmup collocation-warmup"><header><span>重点搭配 · {index + 1}/{sessionEntries.length}</span><h1>单词之后学习重点搭配</h1><p>先整体记忆搭配，再通过测试自动更新掌握状态。</p></header><article className="warmup-card"><h2>{item.phrase}</h2>{!revealed ? <button className="primary-action" onClick={() => setRevealed(true)}>显示搭配释义</button> : <div className="warmup-answer"><strong>{item.meaningZh}</strong><p>{item.example}</p><p>{item.exampleZh}</p><button className="primary-action" onClick={() => setTesting(true)}>开始搭配测试</button></div>}</article></section>;

  return <section className="exercise-runner collocation-check"><header><div><span>{exercise.instruction}</span><h1>重点搭配检测</h1><p>每题只隐藏一项，不提供选项；答错会自动进入错题复习。</p></div><b>{index + 1} / {sessionEntries.length}</b></header><article className="recall-card"><strong>{exercise.prompt}</strong>{exercise.hint && <p>中文提示：{exercise.hint}</p>}<label>填写唯一空白<input aria-label="填写重点搭配" autoComplete="off" value={response} disabled={result !== null || saving} onChange={(event) => setResponse(event.target.value)} /></label></article>{error && <p role="alert">{error}</p>}{result !== null && <p role="status" className={result ? 'correct' : 'incorrect'}>{result ? '本次检测通过，已进入间隔巩固。' : `回答错误，已重新加入待复习。正确答案：${exercise.answer}。${item.exampleZh}`}</p>}{result === null ? <button className="primary-action" disabled={!response.trim() || saving} onClick={() => void submit()}>{saving ? '正在保存…' : '提交搭配答案'}</button> : result ? <button className="primary-action" onClick={next}>{index >= sessionEntries.length - 1 ? '完成重点搭配' : '下一个重点搭配'}</button> : <button className="primary-action" onClick={retry}>重新测试这个搭配</button>}</section>;
}
