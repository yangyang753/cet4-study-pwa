import { useEffect, useState } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { learningVocabulary } from '../../content/vocabularyLearning';
import type { VocabularyEntry } from '../../domain/content';
import type { KnowledgeState } from '../../domain/learning';
import { selectWarmupWords } from './selectWarmupWords';

const vocabulary = learningVocabulary;

export function VocabularyWarmup({ repository, entries = vocabulary, limit = 10, onComplete }: {
  repository: LearningRepository;
  entries?: VocabularyEntry[];
  limit?: number;
  onComplete: () => void;
}) {
  const [words, setWords] = useState<VocabularyEntry[] | null>(null);
  const [states, setStates] = useState<Map<string, KnowledgeState>>(() => new Map());
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingStatus, setPendingStatus] = useState<'review' | 'learning' | null>(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const snapshot = await repository.getDashboardSnapshot();
        if (!active) return;
        const saved = new Map(snapshot.knowledgeStates.map((state) => [state.itemId, state]));
        setStates(saved);
        setWords(selectWarmupWords(entries, snapshot.knowledgeStates, limit));
      } catch {
        if (active) setWords(selectWarmupWords(entries, [], limit));
      }
    })();
    return () => { active = false; };
  }, [entries, limit, repository]);

  const word = words?.[index];

  async function save(status: 'review' | 'learning') {
    if (!word || saving) return;
    setSaving(true);
    setError('');
    setPendingStatus(status);
    const existing = states.get(word.id);
    const next: KnowledgeState = {
      id: `knowledge:${word.id}`,
      itemId: word.id,
      status,
      favorite: existing?.favorite ?? false,
      updatedAt: new Date().toISOString(),
    };
    try {
      await repository.upsertKnowledgeState(next);
      setStates((current) => new Map(current).set(word.id, next));
      setPendingStatus(null);
      if (words && index >= words.length - 1) {
        setComplete(true);
        onComplete();
      } else {
        setIndex((current) => current + 1);
        setRevealed(false);
      }
    } catch {
      setError('保存失败，当前单词已保留，请重新保存。');
    } finally {
      setSaving(false);
    }
  }

  if (complete) return <section className="vocabulary-warmup complete"><h1>单词热身完成</h1><p>已记录这组单词，接下来用题目检查是否会用。</p></section>;
  if (!words) return <p role="status">正在准备今日高频词…</p>;
  if (!word) return <section className="vocabulary-warmup"><h1>暂无可学习单词</h1><button onClick={onComplete}>继续做题</button></section>;

  return <section className="vocabulary-warmup">
    <header><span>词汇热身 · {index + 1}/{words.length}</span><h1>先学单词，再开始做题</h1><p>先看英文回想词义，再显示答案。这里只记录学习状态，不会直接算作已掌握。</p></header>
    <article className="warmup-card">
      <h2>{word.word}</h2><p className="phonetic">{word.phonetic} · {word.partOfSpeech}</p>
      {!revealed ? <button className="primary-action" onClick={() => setRevealed(true)}>显示释义</button> : <div className="warmup-answer"><strong>{word.meaningZh}</strong><p>{word.example}</p>{word.exampleZh && <p>{word.exampleZh}</p>}<div><button disabled={saving} onClick={() => void save('review')}>还不会</button><button disabled={saving} className="primary-action" onClick={() => void save('learning')}>基本认识</button></div></div>}
      {error && <p role="alert">{error}</p>}
      {error && pendingStatus && <button disabled={saving} onClick={() => void save(pendingStatus)}>重新保存</button>}
    </article>
  </section>;
}
