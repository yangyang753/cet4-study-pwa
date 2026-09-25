import { useEffect, useMemo, useState } from 'react';
import collocations from '../../../content/v1/collocations.json';
import grammarTopics from '../../../content/v1/grammarTopics.json';
import { learningVocabulary as vocabulary } from '../../content/vocabularyLearning';
import './knowledge.css';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { KnowledgeState } from '../../domain/learning';

type Tab = 'vocabulary' | 'collocations' | 'grammar';
type VocabularyView = 'unlearned' | 'active' | 'mastered';
const defaultRepository = new DexieLearningRepository();

export function KnowledgePage({ repository = defaultRepository }: { repository?: LearningRepository }) {
  const [tab, setTab] = useState<Tab>('vocabulary');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(18);
  const [vocabularyView, setVocabularyView] = useState<VocabularyView>('unlearned');
  const [states, setStates] = useState<Map<string, KnowledgeState>>(() => new Map());
  const [saveError, setSaveError] = useState('');
  useEffect(() => {
    let active = true;
    void repository.getDashboardSnapshot().then((snapshot) => {
      if (!active) return;
      setStates((current) => {
        const next = new Map(current);
        snapshot.knowledgeStates.forEach((state) => next.set(state.itemId, state));
        return next;
      });
    }).catch(() => {
      // The knowledge library remains usable when local storage is unavailable.
    });
    return () => { active = false; };
  }, [repository]);
  const filteredWords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return vocabulary.filter((item) => {
      const status = states.get(item.id)?.status;
      if (vocabularyView === 'unlearned' && status) return false;
      if (vocabularyView === 'active' && status !== 'learning' && status !== 'review') return false;
      if (vocabularyView === 'mastered' && status !== 'mastered') return false;
      return !normalized || `${item.word} ${item.meaningZh}`.toLowerCase().includes(normalized);
    });
  }, [query, states, vocabularyView]);
  const words = filteredWords.slice(0, visibleCount);
  const counts = useMemo(() => vocabulary.reduce((result, item) => {
    const existing = states.get(item.id);
    if (!existing) result.unlearned += 1;
    else if (existing.status === 'mastered') result.mastered += 1;
    else result.active += 1;
    return result;
  }, { unlearned: 0, active: 0, mastered: 0 }), [states]);
  const markReferenceMastered = async (itemId: string) => {
    const existing = states.get(itemId);
    const next: KnowledgeState = { id: `knowledge:${itemId}`, itemId, status: 'mastered', favorite: existing?.favorite ?? false, updatedAt: new Date().toISOString() };
    setSaveError('');
    try {
      await repository.upsertKnowledgeState(next);
      setStates((current) => new Map(current).set(itemId, next));
    } catch {
      setSaveError('掌握状态保存失败，请重试。');
    }
  };
  const isMastered = (itemId: string) => states.get(itemId)?.status === 'mastered';

  return <section className="knowledge-page">
    <header className="knowledge-heading"><div><span>HIGH-FREQUENCY LIBRARY</span><h1>四级高频知识库</h1><p>按公开词频数据与四级题型整理；练习均为原创仿真内容，不是历年官方真题。</p></div><a href={`${import.meta.env.BASE_URL}print`}>打印今日练习 →</a></header>
    <div className="inventory" aria-label="内容规模"><article><strong>800</strong><span>高频词</span></article><article><strong>126</strong><span>重点搭配</span></article><article><strong>15</strong><span>语法专题</span></article></div>
    <div className="knowledge-tabs" role="tablist" aria-label="知识类型">
      <button role="tab" aria-selected={tab === 'vocabulary'} onClick={() => setTab('vocabulary')}>高频词汇</button>
      <button role="tab" aria-selected={tab === 'collocations'} onClick={() => setTab('collocations')}>重点搭配</button>
      <button role="tab" aria-selected={tab === 'grammar'} onClick={() => setTab('grammar')}>语法专题</button>
    </div>
    {saveError && <p role="alert">{saveError}</p>}
    {tab === 'vocabulary' && <><div className="vocabulary-state-tabs" role="group" aria-label="单词掌握状态"><button aria-pressed={vocabularyView === 'unlearned'} onClick={() => { setVocabularyView('unlearned'); setVisibleCount(18); }}>待学习（{counts.unlearned}）</button><button aria-pressed={vocabularyView === 'active'} onClick={() => { setVocabularyView('active'); setVisibleCount(18); }}>学习中与待复习（{counts.active}）</button><button aria-pressed={vocabularyView === 'mastered'} onClick={() => { setVocabularyView('mastered'); setVisibleCount(18); }}>已掌握（{counts.mastered}）</button></div><div className="knowledge-tools"><label className="knowledge-search">搜索高频词<input type="search" aria-label="搜索高频词" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(18); }} placeholder="输入英文或中文释义" /></label></div><p className="automatic-mastery-note">掌握状态由翻译、词义和拼写检测自动更新；复习答错会自动回到待复习。</p><div className="word-grid">{words.map((item) => { const status = states.get(item.id)?.status; return <article key={item.id} className={`word-card ${status ?? ''}`}><span>词频 {item.frequency ?? '—'}</span>{!status && <b className="knowledge-status unlearned">待学习</b>}{status === 'review' && <b className="knowledge-status">待复习</b>}{status === 'learning' && <b className="knowledge-status learning">学习中</b>}{status === 'mastered' && <b className="knowledge-status mastered">系统已验证掌握</b>}<h2>{item.word}</h2><p className="phonetic">{item.phonetic}</p><p>{item.meaningZh}</p>{item.example && <small>{item.example}</small>}{item.exampleZh && <small>{item.exampleZh}</small>}</article>; })}</div>{words.length === 0 && <p className="empty-result">当前分区没有匹配的单词。</p>}{words.length < filteredWords.length && <button className="load-more" onClick={() => setVisibleCount((count) => count + 18)}>加载更多（已显示 {words.length} / {filteredWords.length}）</button>}</>}
    {tab === 'collocations' && <div className="phrase-list">{collocations.map((item) => <article key={item.id}><h2>{item.phrase}</h2><p>{item.meaningZh}</p><small>{item.example}</small><small>{item.exampleZh}</small><button disabled={isMastered(item.id)} onClick={() => void markReferenceMastered(item.id)}>{isMastered(item.id) ? '已掌握' : '标记为已掌握'}</button></article>)}</div>}
    {tab === 'grammar' && <div className="grammar-grid">{grammarTopics.map((item, index) => <article key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><h2>{item.title}</h2><p>{item.summary}</p><ul>{item.checklist.map((line) => <li key={line}>{line}</li>)}</ul><button disabled={isMastered(item.id)} onClick={() => void markReferenceMastered(item.id)}>{isMastered(item.id) ? '已掌握' : '标记为已掌握'}</button></article>)}</div>}
  </section>;
}
