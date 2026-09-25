import { useMemo, useState } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { VocabularyEntry } from '../../domain/content';
import type { KnowledgeState } from '../../domain/learning';
import { evaluateTranslation, type TranslationEvaluation } from '../translation/evaluateTranslation';
import { buildVocabularyPassage } from './buildVocabularyPassage';
import { applyVocabularyReviewResult } from './vocabularySchedule';

export function VocabularyTranslationCheck({ repository, words, states = [], now = new Date().toISOString(), onComplete }: {
  repository: LearningRepository;
  words: VocabularyEntry[];
  states?: KnowledgeState[];
  now?: string;
  onComplete: () => void;
}) {
  const passage = useMemo(() => buildVocabularyPassage(words), [words]);
  const stateById = useMemo(() => new Map(states.map((item) => [item.itemId, item])), [states]);
  const [translation, setTranslation] = useState('');
  const [result, setResult] = useState<TranslationEvaluation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const baseState = (word: VocabularyEntry, status: KnowledgeState['status']): KnowledgeState => stateById.get(word.id) ?? {
    id: `knowledge:${word.id}`, itemId: word.id, status, favorite: false, reviewStage: 0, lapseCount: 0, updatedAt: now,
  };

  async function submit() {
    if (!translation.trim() || saving) return;
    const evaluation = evaluateTranslation([{ id: 'daily-vocabulary', text: passage.text, translation }], passage.words);
    const missed = new Set(evaluation.missedWords.map((item) => item.id));
    setSaving(true); setError('');
    try {
      await Promise.all(passage.words.map(async (word) => {
        const correct = !missed.has(word.id);
        await repository.upsertKnowledgeState(applyVocabularyReviewResult(baseState(word, correct ? 'learning' : 'review'), correct, now));
        if (!correct) await repository.upsertReviewCard({
          id: `review:${word.id}:meaning`, questionId: `${word.id}:meaning`, stage: 0, priority: 6,
          nextReviewAt: now, lastCorrect: false, updatedAt: now,
        });
      }));
      setResult(evaluation);
    } catch {
      setError('翻译检测结果保存失败，内容已保留，请重新检查。');
    } finally {
      setSaving(false);
    }
  }

  async function acceptMeaning(word: VocabularyEntry) {
    setSaving(true); setError('');
    try {
      const corrected = applyVocabularyReviewResult(baseState(word, 'review'), true, now);
      await repository.upsertKnowledgeState(corrected);
      await repository.upsertReviewCard({ id: `review:${word.id}:meaning`, questionId: `${word.id}:meaning`, stage: 4, priority: 1, nextReviewAt: corrected.nextReviewAt!, lastCorrect: true, updatedAt: now });
      setResult((current) => current ? {
        ...current,
        missedWords: current.missedWords.filter((item) => item.id !== word.id),
        coveredWords: [...current.coveredWords, current.missedWords.find((item) => item.id === word.id)!].filter(Boolean),
      } : current);
    } catch {
      setError('更正结果保存失败，请重试。');
    } finally {
      setSaving(false);
    }
  }

  if (!passage.words.length) return <button className="primary-action" onClick={onComplete}>继续做题</button>;

  return <section className="vocabulary-translation-check">
    <header><span>今日新词检测</span><h1>用一段话检查是否真正理解</h1><p>翻译下面短文。系统会检查今天学过的重点词义，漏译的词会进入错题复习。</p></header>
    <article className="translation-passage"><p lang="en">{passage.text}</p></article>
    <label>我的中文翻译<textarea aria-label="我的中文翻译" value={translation} disabled={Boolean(result)} onChange={(event) => setTranslation(event.target.value)} rows={6} /></label>
    {error && <p role="alert">{error}</p>}
    {!result ? <button className="primary-action" disabled={!translation.trim() || saving} onClick={() => void submit()}>{saving ? '正在保存…' : '检查翻译'}</button> : <div className="translation-result" role="status">
      <strong>{result.missedWords.length ? `${result.missedWords.length} 个词义需要加强` : '本轮重点词义全部覆盖'}</strong>
      {result.missedWords.map((word) => <div key={word.id}><span>{word.word}：{word.meaningZh}</span><button disabled={saving} onClick={() => void acceptMeaning(word)}>我确实表达了这个词义</button></div>)}
      <button className="primary-action" disabled={saving} onClick={onComplete}>继续做词义题</button>
    </div>}
  </section>;
}
