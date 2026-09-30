import { useEffect, useMemo, useRef, useState } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { VocabularyEntry } from '../../domain/content';
import type { KnowledgeState } from '../../domain/learning';
import { recordTranslationResult, vocabularyReviewCard } from '../vocabulary/wordMastery';
import { evaluateCultureTranslation, type CultureTranslationEvaluation, type CultureTranslationPrompt } from './cultureTranslation';

export function DailyCultureTranslation({ repository, prompt, vocabulary, states, date, now = new Date().toISOString(), initialAnswer = '', onDraftChange, onPassed, onComplete }: {
  repository: LearningRepository;
  prompt: CultureTranslationPrompt;
  vocabulary: VocabularyEntry[];
  states: KnowledgeState[];
  date: string;
  now?: string;
  initialAnswer?: string;
  onDraftChange?: (answer: string) => void | Promise<void>;
  onPassed?: (answer: string) => void | Promise<void>;
  onComplete: () => void;
}) {
  const stateById = useMemo(() => new Map(states.map((item) => [item.itemId, item])), [states]);
  const wordById = useMemo(() => new Map(vocabulary.map((word) => [word.id, word])), [vocabulary]);
  const [answer, setAnswer] = useState(initialAnswer);
  const [result, setResult] = useState<CultureTranslationEvaluation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attemptNumber, setAttemptNumber] = useState(1);
  const draftCallback = useRef(onDraftChange);
  const initialDraft = useRef(initialAnswer);
  useEffect(() => { draftCallback.current = onDraftChange; }, [onDraftChange]);
  useEffect(() => {
    if (answer === initialDraft.current) return;
    const timeout = window.setTimeout(() => {
      void Promise.resolve(draftCallback.current?.(answer)).catch(() => setError('翻译草稿自动保存失败，请继续作答后重试。'));
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [answer]);

  async function submit() {
    if (!answer.trim() || saving) return;
    const evaluation = evaluateCultureTranslation(prompt, answer, vocabulary);
    const missed = new Set(evaluation.reviewWordIds);
    setSaving(true); setError('');
    try {
      await onDraftChange?.(answer);
      await repository.saveAttemptOnce({
        id: `culture-translation:${date}:${prompt.id}:${attemptNumber}`,
        userId: 'local-user',
        questionId: prompt.id,
        response: answer,
        correct: evaluation.passed,
        score: evaluation.coveredWordIds.length / prompt.targetWordIds.length,
        durationSeconds: 0,
        contentVersion: 'v1',
        kind: 'translation',
        mode: 'practice',
        deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device',
        createdAt: now,
      });
      await Promise.all(prompt.targetWordIds.map(async (wordId) => {
        const correct = !missed.has(wordId);
        await repository.upsertKnowledgeState(recordTranslationResult(stateById.get(wordId), wordId, correct, now));
        if (!correct) await repository.upsertReviewCard(vocabularyReviewCard(wordId, 'cloze', now));
      }));
      if (evaluation.passed) await onPassed?.(answer);
      setResult(evaluation);
    } catch {
      setError('文化翻译结果保存失败，答案已保留，请重新保存。');
    } finally {
      setSaving(false);
    }
  }

  return <section className="vocabulary-translation-check culture-translation-check">
    <header><span>今日主题 · {prompt.theme}</span><h1>中国文化翻译</h1><p>请把中文译成英文。提交前只提供中文提示；漏用的目标词会自动加入错题复习。</p></header>
    <article className="translation-passage"><p lang="zh-CN">{prompt.promptZh}</p></article>
    <label>我的英文翻译<textarea aria-label="我的英文翻译" value={answer} disabled={Boolean(result)} onChange={(event) => setAnswer(event.target.value)} onBlur={() => {
      void Promise.resolve(onDraftChange?.(answer)).catch(() => setError('翻译草稿保存失败，请重新点击输入框后再试。'));
    }} rows={7} /></label>
    {!result && <div className="translation-targets" aria-label="今日中文提示">中文提示：{prompt.targetWordIds.map((id) => wordById.get(id)?.meaningZh).filter(Boolean).join(' · ')}</div>}
    {error && <p role="alert">{error}</p>}
    {!result ? <button className="primary-action" disabled={!answer.trim() || saving} onClick={() => void submit()}>{saving ? '正在保存…' : error ? '重新保存翻译' : '提交文化翻译'}</button> : <div className="translation-result" role="status">
      <strong>{result.reviewWordIds.length ? `${result.reviewWordIds.length} 个目标词需要加强` : '目标词已全部覆盖且主题信息完整'}</strong>
      <p>参考目标词：{prompt.targetWordIds.map((id) => wordById.get(id)?.word).filter(Boolean).join(' · ')}</p>
      {result.reviewWordIds.map((id) => { const word = wordById.get(id); return word ? <div key={id}><span>{word.word}：{word.meaningZh}</span><small>已自动改为待复习，并加入拼写补全。</small></div> : null; })}
      {!result.complete && <p>译文过短或缺少结束标点，本次暂不判定通过。</p>}
      {!result.meaningComplete && <p>译文缺少题目主题的关键信息，本次暂不判定通过；请对照参考译文检查遗漏。</p>}
      <details><summary>查看参考译文与要点</summary><p>{prompt.referenceAnswer}</p><ul>{prompt.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul></details>
      {result.passed
        ? <button className="primary-action" onClick={onComplete}>继续学习重点搭配</button>
        : <button className="primary-action" onClick={() => { setAttemptNumber((value) => value + 1); setResult(null); }}>修改后重新提交</button>}
    </div>}
  </section>;
}
