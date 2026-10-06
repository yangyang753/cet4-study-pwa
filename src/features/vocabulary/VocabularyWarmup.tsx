import { useEffect, useState } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { learningVocabulary } from '../../content/vocabularyLearning';
import type { VocabularyEntry, VocabularyLayer } from '../../domain/content';
import type { KnowledgeState } from '../../domain/learning';
import { selectWarmupWords } from './selectWarmupWords';
import { PronounceButton } from './PronounceButton';

const vocabulary = learningVocabulary;

export function VocabularyWarmup({ repository, entries = vocabulary, limit = 10, layer, onWordLearned, onComplete }: {
  repository: LearningRepository;
  entries?: VocabularyEntry[];
  limit?: number;
  layer?: VocabularyLayer;
  onWordLearned?: (wordId: string) => void | Promise<void>;
  onComplete: (entries: VocabularyEntry[]) => void;
}) {
  const [words, setWords] = useState<VocabularyEntry[] | null>(null);
  const [states, setStates] = useState<Map<string, KnowledgeState>>(() => new Map());
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [retryPending, setRetryPending] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const snapshot = await repository.getDashboardSnapshot();
        if (!active) return;
        const saved = new Map(snapshot.knowledgeStates.map((state) => [state.itemId, state]));
        setStates(saved);
        setWords(selectWarmupWords(entries, snapshot.knowledgeStates, limit, layer));
      } catch {
        if (active) setWords(selectWarmupWords(entries, [], limit, layer));
      }
    })();
    return () => { active = false; };
  }, [entries, layer, limit, repository]);

  const word = words?.[index];

  async function save() {
    if (!word || saving) return;
    setSaving(true);
    setError('');
    setRetryPending(true);
    const existing = states.get(word.id);
    const next: KnowledgeState = {
      id: `knowledge:${word.id}`,
      itemId: word.id,
      status: 'learning',
      favorite: existing?.favorite ?? false,
      updatedAt: new Date().toISOString(),
    };
    try {
      await repository.upsertKnowledgeState(next);
      await onWordLearned?.(word.id);
      setStates((current) => new Map(current).set(word.id, next));
      setRetryPending(false);
      if (words && index >= words.length - 1) {
        setComplete(true);
        onComplete(words);
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

  if (complete) return <section className="vocabulary-warmup complete"><h1>单词热身完成</h1><p>接下来严格检测拼写和完整词义，全部答对才算完成。</p></section>;
  if (!words) return <p role="status">正在准备今日{layer === 'foundation' ? '基础必会词' : '高频词'}…</p>;
  if (!word) return <section className="vocabulary-warmup"><h1>暂无可学习单词</h1><button onClick={() => onComplete([])}>继续做题</button></section>;

  return <section className="vocabulary-warmup">
    <header><span>词汇热身 · {index + 1}/{words.length}</span><h1>{layer === 'foundation' ? '先学基础必会词，再开始检测' : '先学单词，再开始做题'}</h1><p>先看英文回想词义，再显示答案并进入下一个；掌握情况由后面的严格检测自动判定。</p></header>
    <article className="warmup-card">
      <h2>{word.word}</h2><p className="phonetic">{word.phonetic} · {word.partOfSpeech}</p><PronounceButton text={word.word} />
      {!revealed ? <button className="primary-action" onClick={() => setRevealed(true)}>显示释义</button> : <div className="warmup-answer"><strong>{word.meaningZh}</strong><p>{word.example}</p>{word.exampleZh && <p>{word.exampleZh}</p>}<div><button disabled={saving} className="primary-action" onClick={() => void save()}>{saving ? '正在保存…' : words && index >= words.length - 1 ? '完成单词学习' : '下一个单词'}</button></div></div>}
      {error && <p role="alert">{error}</p>}
      {error && retryPending && <button disabled={saving} onClick={() => void save()}>重新保存</button>}
    </article>
  </section>;
}
