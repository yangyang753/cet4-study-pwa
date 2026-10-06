import { useEffect, useMemo, useState } from 'react';
import { foundationVocabulary } from '../../content/foundationVocabulary';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { KnowledgeState } from '../../domain/learning';
import { appHref } from '../../lib/appHref';
import { PronounceButton } from './PronounceButton';
import { DailyVocabularySession } from './DailyVocabularySession';
import { studyDate } from '../../lib/studyDate';
import '../knowledge/knowledge.css';

type StateView = 'unlearned' | 'active' | 'mastered';
const defaultRepository = new DexieLearningRepository();

function statusCounts(states: Map<string, KnowledgeState>) {
  return foundationVocabulary.reduce((result, word) => {
    const state = states.get(word.id);
    if (!state) result.unlearned += 1;
    else if (state.status === 'mastered') result.mastered += 1;
    else result.active += 1;
    return result;
  }, { unlearned: 0, active: 0, mastered: 0 });
}

function inView(id: string, view: StateView, states: Map<string, KnowledgeState>) {
  const status = states.get(id)?.status;
  if (view === 'unlearned') return !status;
  if (view === 'mastered') return status === 'mastered';
  return status === 'learning' || status === 'review';
}

function StatusBadge({ state }: { state?: KnowledgeState }) {
  if (!state) return <b className="knowledge-status unlearned">待学习</b>;
  if (state.status === 'mastered') return <b className="knowledge-status mastered">系统已验证掌握</b>;
  if (state.status === 'learning') return <b className="knowledge-status learning">学习中</b>;
  return <b className="knowledge-status">待复习</b>;
}

export function FoundationVocabularyPage({ repository = defaultRepository }: { repository?: LearningRepository }) {
  const [states, setStates] = useState<Map<string, KnowledgeState>>(() => new Map());
  const [view, setView] = useState<StateView>('unlearned');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(18);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;
    void repository.getDashboardSnapshot().then((snapshot) => {
      if (!active) return;
      setStates(new Map((snapshot.knowledgeStates ?? [])
        .filter((state) => state.itemId.startsWith('f'))
        .map((state) => [state.itemId, state])));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [repository]);

  const counts = useMemo(() => statusCounts(states), [states]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return foundationVocabulary.filter((word) => inView(word.id, view, states)
      && (!normalized || `${word.word} ${word.meaningZh}`.toLowerCase().includes(normalized)));
  }, [query, states, view]);
  const words = filtered.slice(0, visibleCount);
  const allRevealed = words.length > 0 && words.every((word) => revealedIds.has(word.id));

  return <section className="knowledge-page foundation-library">
    <header className="knowledge-heading"><div><span>FOUNDATION VOCABULARY · 独立词层</span><h1>基础必会词</h1><p>先补齐阅读和听题所需的基础词。与 800 个高频词分开学习、分开检测、分开记录错题。</p></div><div className="knowledge-heading-actions"><a href={appHref('practice/foundation-vocabulary')}>开始今日基础词训练</a><a className="secondary" href={appHref('review/foundation')}>复习基础词错题</a></div></header>
    <div className="inventory foundation-inventory" aria-label="基础词学习概览"><article><strong>{foundationVocabulary.length}</strong><span>基础必会词</span></article><article><strong>{counts.active}</strong><span>学习中与待复习</span></article><article><strong>{counts.mastered}</strong><span>已验证掌握</span></article></div>
    <aside className="automatic-mastery-note">每天学习新词，第二天先复习前一天内容；只有通过主动回忆检测才会自动标记掌握，后续答错会自动降回待复习。</aside>
    <div className="vocabulary-state-tabs" role="group" aria-label="基础必会词掌握状态"><button aria-pressed={view === 'unlearned'} onClick={() => setView('unlearned')}>待学习（{counts.unlearned}）</button><button aria-pressed={view === 'active'} onClick={() => setView('active')}>学习中与待复习（{counts.active}）</button><button aria-pressed={view === 'mastered'} onClick={() => setView('mastered')}>已掌握（{counts.mastered}）</button></div>
    <div className="knowledge-tools"><label className="knowledge-search">搜索基础词<input type="search" aria-label="搜索基础必会词" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(18); }} placeholder="输入英文或中文释义" /></label><button className="meaning-toggle-all" disabled={!words.length} onClick={() => setRevealedIds((current) => { const next = new Set(current); words.forEach((word) => allRevealed ? next.delete(word.id) : next.add(word.id)); return next; })}>{allRevealed ? '隐藏当前全部释义' : '显示当前全部释义'}</button></div>
    <div className="word-grid">{words.map((word) => { const revealed = revealedIds.has(word.id); return <article className={`word-card ${states.get(word.id)?.status ?? ''}`} key={word.id}><span>基础序号 {word.id.slice(1)}</span><StatusBadge state={states.get(word.id)} /><h2>{word.word}</h2><p className="phonetic">{word.phonetic}</p><PronounceButton text={word.word} /><button className="meaning-toggle" aria-expanded={revealed} aria-label={`${revealed ? '隐藏' : '显示'} ${word.word} 的释义`} onClick={() => setRevealedIds((current) => { const next = new Set(current); if (revealed) next.delete(word.id); else next.add(word.id); return next; })}>{revealed ? '隐藏释义' : '点击显示释义'}</button>{revealed && <div className="word-reveal"><p>{word.partOfSpeech} {word.meaningZh}</p><small>{word.example}</small><small>{word.exampleZh}</small></div>}</article>; })}</div>
    {!words.length && <p className="empty-result">当前分区没有匹配的基础词。</p>}
    {words.length < filtered.length && <button className="load-more" onClick={() => setVisibleCount((count) => count + 18)}>继续加载基础词（已显示 {words.length} / {filtered.length}）</button>}
  </section>;
}

export function FoundationVocabularyPracticeRoute() {
  return <DailyVocabularySession repository={defaultRepository} entries={foundationVocabulary} collocationEntries={[]} layer="foundation" today={studyDate()} onComplete={() => undefined} />;
}
