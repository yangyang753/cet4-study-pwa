import { useMemo, useState } from 'react';
import vocabulary from '../../../content/v1/vocabulary.json';
import collocations from '../../../content/v1/collocations.json';
import grammarTopics from '../../../content/v1/grammarTopics.json';
import './knowledge.css';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';

type Tab = 'vocabulary' | 'collocations' | 'grammar';
const defaultRepository = new DexieLearningRepository();

export function KnowledgePage({ repository = defaultRepository }: { repository?: LearningRepository }) {
  const [tab, setTab] = useState<Tab>('vocabulary');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(18);
  const [mastered, setMastered] = useState<Set<string>>(() => new Set());
  const filteredWords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return vocabulary.filter((item) => !normalized || `${item.word} ${item.meaningZh}`.toLowerCase().includes(normalized));
  }, [query]);
  const words = filteredWords.slice(0, visibleCount);
  const markMastered = (itemId: string) => {
    setMastered((current) => new Set(current).add(itemId));
    void repository.upsertKnowledgeState({ id: `knowledge:${itemId}`, itemId, status: 'mastered', favorite: false, updatedAt: new Date().toISOString() });
  };

  return <section className="knowledge-page">
    <header className="knowledge-heading"><div><span>HIGH-FREQUENCY LIBRARY</span><h1>四级高频知识库</h1><p>按历年公开词频数据整理，先掌握高频，再补齐薄弱点。</p></div><a href={`${import.meta.env.BASE_URL}print`}>打印今日练习 →</a></header>
    <div className="inventory" aria-label="内容规模"><article><strong>800</strong><span>高频词</span></article><article><strong>126</strong><span>重点搭配</span></article><article><strong>15</strong><span>语法专题</span></article></div>
    <div className="knowledge-tabs" role="tablist" aria-label="知识类型">
      <button role="tab" aria-selected={tab === 'vocabulary'} onClick={() => setTab('vocabulary')}>高频词汇</button>
      <button role="tab" aria-selected={tab === 'collocations'} onClick={() => setTab('collocations')}>重点搭配</button>
      <button role="tab" aria-selected={tab === 'grammar'} onClick={() => setTab('grammar')}>语法专题</button>
    </div>
    {tab === 'vocabulary' && <><label className="knowledge-search">搜索高频词<input type="search" aria-label="搜索高频词" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(18); }} placeholder="输入英文或中文释义" /></label><div className="word-grid">{words.map((item) => <article key={item.id} className="word-card"><span>词频 {item.frequency}</span><h2>{item.word}</h2><p className="phonetic">{item.phonetic}</p><p>{item.meaningZh}</p><small>{item.example}</small><button disabled={mastered.has(item.id)} onClick={() => markMastered(item.id)}>{mastered.has(item.id) ? '已掌握' : '标记为已掌握'}</button></article>)}</div>{words.length === 0 && <p className="empty-result">没有匹配结果，试试更短的关键词。</p>}{words.length < filteredWords.length && <button className="load-more" onClick={() => setVisibleCount((count) => count + 18)}>加载更多（已显示 {words.length} / {filteredWords.length}）</button>}</>}
    {tab === 'collocations' && <div className="phrase-list">{collocations.map((item) => <article key={item.id}><h2>{item.phrase}</h2><p>{item.meaningZh}</p><small>{item.example}</small><button disabled={mastered.has(item.id)} onClick={() => markMastered(item.id)}>{mastered.has(item.id) ? '已掌握' : '标记为已掌握'}</button></article>)}</div>}
    {tab === 'grammar' && <div className="grammar-grid">{grammarTopics.map((item, index) => <article key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><h2>{item.title}</h2><p>{item.summary}</p><ul>{item.checklist.map((line) => <li key={line}>{line}</li>)}</ul><button disabled={mastered.has(item.id)} onClick={() => markMastered(item.id)}>{mastered.has(item.id) ? '已掌握' : '标记为已掌握'}</button></article>)}</div>}
  </section>;
}
