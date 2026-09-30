import { useEffect, useMemo, useState } from 'react';
import collocations from '../../../content/v1/collocations.json';
import grammarTopics from '../../../content/v1/grammarTopics.json';
import { learningVocabulary as vocabulary } from '../../content/vocabularyLearning';
import './knowledge.css';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { KnowledgeState } from '../../domain/learning';
import { appHref } from '../../lib/appHref';
import type { WordReinforcement } from './wordReinforcement';
import { buildWordReinforcement, gradeWordReinforcement } from './wordReinforcement';
import { applyKnowledgeReviewResult } from '../mastery/knowledgeMastery';
import { vocabularyReviewCard } from '../vocabulary/wordMastery';
import { createAggregateReviewSession, recordAggregateReviewResult, type AggregateReviewSession } from './aggregateReviewSession';

type Tab = 'vocabulary' | 'collocations' | 'grammar';
type StateView = 'unlearned' | 'active' | 'mastered';
const defaultRepository = new DexieLearningRepository();

function statusCounts(items: Array<{ id: string }>, states: Map<string, KnowledgeState>) {
  return items.reduce((result, item) => {
    const existing = states.get(item.id);
    if (!existing) result.unlearned += 1;
    else if (existing.status === 'mastered') result.mastered += 1;
    else result.active += 1;
    return result;
  }, { unlearned: 0, active: 0, mastered: 0 });
}

function inView(itemId: string, view: StateView, states: Map<string, KnowledgeState>) {
  const status = states.get(itemId)?.status;
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

export function KnowledgePage({ repository = defaultRepository, random = Math.random }: { repository?: LearningRepository; random?: () => number }) {
  const [reviewReferenceTime] = useState(() => new Date().toISOString());
  const [tab, setTab] = useState<Tab>('vocabulary');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(18);
  const [stateView, setStateView] = useState<StateView>('unlearned');
  const [states, setStates] = useState<Map<string, KnowledgeState>>(() => new Map());
  const [revealedWordIds, setRevealedWordIds] = useState<Set<string>>(() => new Set());
  const [exercise, setExercise] = useState<WordReinforcement | null>(null);
  const [englishAnswer, setEnglishAnswer] = useState('');
  const [chineseAnswer, setChineseAnswer] = useState('');
  const [exerciseResult, setExerciseResult] = useState('');
  const [exerciseSaving, setExerciseSaving] = useState(false);
  const [aggregateSession, setAggregateSession] = useState<AggregateReviewSession | null>(null);
  const [attemptId, setAttemptId] = useState('');
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
      if (stateView === 'unlearned' && status) return false;
      if (stateView === 'active' && status !== 'learning' && status !== 'review') return false;
      if (stateView === 'mastered' && status !== 'mastered') return false;
      return !normalized || `${item.word} ${item.meaningZh}`.toLowerCase().includes(normalized);
    });
  }, [query, stateView, states]);
  const words = filteredWords.slice(0, visibleCount);
  const counts = useMemo(() => statusCounts(vocabulary, states), [states]);
  const collocationCounts = useMemo(() => statusCounts(collocations, states), [states]);
  const reviewWords = useMemo(() => vocabulary.filter((item) => {
    const state = states.get(item.id);
    if (!state) return false;
    if (state.status !== 'mastered') return true;
    return Boolean(state.nextReviewAt) && Date.parse(state.nextReviewAt!) <= Date.parse(reviewReferenceTime);
  }).sort((left, right) => {
    const leftState = states.get(left.id)!;
    const rightState = states.get(right.id)!;
    return Number(rightState.status === 'review') - Number(leftState.status === 'review')
      || (rightState.lapseCount ?? 0) - (leftState.lapseCount ?? 0);
  }), [reviewReferenceTime, states]);
  const filteredCollocations = useMemo(() => collocations.filter((item) => inView(item.id, stateView, states)), [stateView, states]);
  const changeTab = (next: Tab) => { setTab(next); setStateView('unlearned'); setVisibleCount(18); setQuery(''); };

  const openExercise = (word: typeof vocabulary[number]) => {
    setExercise(buildWordReinforcement(word, random));
    setEnglishAnswer(''); setChineseAnswer(''); setExerciseResult(''); setAttemptId(crypto.randomUUID());
  };

  const startAggregateReview = () => {
    if (!reviewWords.length) return;
    const session = createAggregateReviewSession(reviewWords.map((word) => word.id), random);
    const word = vocabulary.find((item) => item.id === session.currentId);
    setAggregateSession(session);
    if (word) openExercise(word);
  };

  const continueAggregateReview = () => {
    if (!aggregateSession || aggregateSession.completed) { setExercise(null); return; }
    const word = vocabulary.find((item) => item.id === aggregateSession.currentId);
    if (word) openExercise(word);
  };

  const submitExercise = async () => {
    if (!exercise || exerciseSaving) return;
    const grade = gradeWordReinforcement(exercise, { english: englishAnswer, chinese: chineseAnswer });
    const now = new Date().toISOString();
    const current = states.get(exercise.word.id);
    const next = applyKnowledgeReviewResult(current, exercise.word.id, grade.correct, now);
    setExerciseSaving(true);
    try {
      await repository.saveAttemptOnce({
        id: attemptId || crypto.randomUUID(), userId: 'local-learner', questionId: exercise.id,
        response: JSON.stringify({ english: englishAnswer, chinese: chineseAnswer }), correct: grade.correct,
        score: grade.correct ? 1 : 0, durationSeconds: 0, contentVersion: 'v1', kind: 'vocabulary', mode: 'review',
        deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device', createdAt: now,
      });
      await repository.upsertKnowledgeState(next);
      if (!grade.spellingCorrect) await repository.upsertReviewCard(vocabularyReviewCard(exercise.word.id, 'cloze', now));
      if (grade.missingMeanings.length || grade.unexpectedMeanings.length) await repository.upsertReviewCard(vocabularyReviewCard(exercise.word.id, 'meaning', now));
      setStates((items) => new Map(items).set(exercise.word.id, next));
      setAggregateSession((session) => session ? recordAggregateReviewResult(session, grade.correct) : session);
      setExerciseResult(grade.correct ? '回答完全正确，已记录一次巩固。' : `本次未通过，已加入错题复习。${!grade.spellingCorrect ? `正确拼写：${exercise.word.word}。` : ''}${grade.missingMeanings.length ? `漏译：${grade.missingMeanings.join('、')}。` : ''}${grade.unexpectedMeanings.length ? `多写或误译：${grade.unexpectedMeanings.join('、')}。` : ''}`);
    } catch {
      setExerciseResult('巩固结果保存失败，答案已保留，请重新提交。');
    } finally {
      setExerciseSaving(false);
    }
  };

  return <section className="knowledge-page">
    <header className="knowledge-heading"><div><span>HIGH-FREQUENCY LIBRARY</span><h1>四级高频知识库</h1><p>按公开词频数据与四级题型整理；练习均为原创仿真内容，不是历年官方真题。</p></div><a href={appHref('print')}>打印今日练习 →</a></header>
    <div className="inventory" aria-label="内容规模"><article><strong>800</strong><span>高频词</span></article><article><strong>126</strong><span>重点搭配</span></article><article><strong>15</strong><span>语法专题</span></article></div>
    <div className="knowledge-tabs" role="tablist" aria-label="知识类型">
      <button role="tab" aria-selected={tab === 'vocabulary'} onClick={() => changeTab('vocabulary')}>高频词汇</button>
      <button role="tab" aria-selected={tab === 'collocations'} onClick={() => changeTab('collocations')}>重点搭配</button>
      <button role="tab" aria-selected={tab === 'grammar'} onClick={() => changeTab('grammar')}>语法专题</button>
    </div>
    {tab === 'vocabulary' && <>
      <section className="aggregate-review" aria-labelledby="aggregate-review-title">
        <div><span>RECALL WITHOUT HINTS</span><h2 id="aggregate-review-title">无提示待复习总巩固</h2><p>从已经学过的单词中随机抽题，不显示目标词名。答错会自动降为待复习并进入错题复习。</p></div>
        <div className="aggregate-review-stats"><strong>{reviewWords.length}</strong><span>个已学单词可检测</span><button disabled={!reviewWords.length} aria-label={`开始待复习词总巩固，共 ${reviewWords.length} 个`} onClick={startAggregateReview}>{reviewWords.length ? '开始随机总巩固 →' : '先完成今日新词'}</button></div>
      </section>
      {exercise && <section className="reinforcement-panel aggregate-session" aria-labelledby="reinforcement-title">
        <button className="reinforcement-close" aria-label="关闭巩固练习" onClick={() => setExercise(null)}>×</button>
        <span>NO-HINT REVIEW · 第 {Math.min((aggregateSession?.answeredCount ?? 0) + 1, aggregateSession?.queue.length ?? 1)} / {aggregateSession?.queue.length ?? 1} 题</span><h2 id="reinforcement-title">待复习单词总巩固</h2>
        {exercise.kind === 'meaning' && <p className="reinforcement-prompt">看英文，写出全部中文释义：<strong>{exercise.word.word}</strong></p>}
        {exercise.kind === 'spelling' && <p className="reinforcement-prompt">根据中文写出完整英文：<strong>{exercise.word.meaningZh}</strong></p>}
        {exercise.kind === 'cloze' && <p className="reinforcement-prompt">补全随机缺失的字母：<strong>{exercise.cloze}</strong><small>{exercise.word.meaningZh}</small></p>}
        {exercise.kind === 'dual' && <p className="reinforcement-prompt">双重检测：补全 <strong>{exercise.cloze}</strong>，并写出全部中文释义。</p>}
        {exercise.kind !== 'meaning' && <label>英文答案<input aria-label="英文答案" autoComplete="off" value={englishAnswer} onChange={(event) => setEnglishAnswer(event.target.value)} /></label>}
        {(exercise.kind === 'meaning' || exercise.kind === 'dual') && <label>中文释义<textarea aria-label="中文释义答案" value={chineseAnswer} onChange={(event) => setChineseAnswer(event.target.value)} rows={3} /></label>}
        {exerciseResult && <p className={exerciseResult.startsWith('回答完全正确') ? 'reinforcement-success' : 'reinforcement-error'} role="status">{exerciseResult}</p>}
        {!exerciseResult && <button className="reinforcement-submit" disabled={exerciseSaving || (exercise.kind !== 'meaning' && !englishAnswer.trim()) || ((exercise.kind === 'meaning' || exercise.kind === 'dual') && !chineseAnswer.trim())} onClick={() => void submitExercise()}>{exerciseSaving ? '正在保存…' : '提交巩固结果'}</button>}
        {exerciseResult && <button className="reinforcement-again" onClick={continueAggregateReview}>{aggregateSession?.completed ? '查看本轮报告' : '下一道巩固'}</button>}
      </section>}
      {aggregateSession?.completed && !exercise && <section className="aggregate-summary" aria-labelledby="aggregate-summary-title"><span>ROUND COMPLETE</span><h2 id="aggregate-summary-title">本轮巩固完成</h2><div><b>测试 {aggregateSession.answeredCount} 个</b><b>完全正确 {aggregateSession.correctCount} 个</b><b>需要重学 {aggregateSession.missedCount} 个</b></div><p>{aggregateSession.missedCount ? '答错或漏译的单词已经进入错题复习，并会重新安排间隔检测。' : '本轮全部通过，系统已安排下一次间隔检测。'}</p><button onClick={startAggregateReview}>开始新一轮</button></section>}
      <div className="vocabulary-state-tabs" role="group" aria-label="单词掌握状态"><button aria-pressed={stateView === 'unlearned'} onClick={() => { setStateView('unlearned'); setVisibleCount(18); }}>待学习（{counts.unlearned}）</button><button aria-pressed={stateView === 'active'} onClick={() => { setStateView('active'); setVisibleCount(18); }}>学习中与待复习（{counts.active}）</button><button aria-pressed={stateView === 'mastered'} onClick={() => { setStateView('mastered'); setVisibleCount(18); }}>已掌握（{counts.mastered}）</button></div>
      <div className="knowledge-tools"><label className="knowledge-search">搜索高频词<input type="search" aria-label="搜索高频词" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(18); }} placeholder="输入英文或中文释义" /></label></div>
      <p className="automatic-mastery-note">释义默认隐藏，先主动回想再点击查看；统一巩固会随机切换题型，答错自动进入错题复习。</p>
      <div className="word-grid">{words.map((item) => { const revealed = revealedWordIds.has(item.id); return <article key={item.id} className={`word-card ${states.get(item.id)?.status ?? ''}`}><span>词频 {item.frequency ?? '—'}</span><StatusBadge state={states.get(item.id)} /><h2>{item.word}</h2><p className="phonetic">{item.phonetic}</p><button className="meaning-toggle" aria-expanded={revealed} aria-label={`${revealed ? '隐藏' : '显示'} ${item.word} 的释义`} onClick={() => setRevealedWordIds((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })}>{revealed ? '隐藏释义' : '点击显示释义'}</button>{revealed && <div className="word-reveal"><p>{item.meaningZh}</p>{item.example && <small>{item.example}</small>}{item.exampleZh && <small>{item.exampleZh}</small>}</div>}</article>; })}</div>
      {words.length === 0 && <p className="empty-result">当前分区没有匹配的单词。</p>}{words.length < filteredWords.length && <button className="load-more" onClick={() => setVisibleCount((count) => count + 18)}>继续加载词汇（已显示 {words.length} / {filteredWords.length}）</button>}
    </>}
    {tab === 'collocations' && <><div className="vocabulary-state-tabs" role="group" aria-label="重点搭配掌握状态"><button aria-pressed={stateView === 'unlearned'} onClick={() => setStateView('unlearned')}>待学习（{collocationCounts.unlearned}）</button><button aria-pressed={stateView === 'active'} onClick={() => setStateView('active')}>学习中与待复习（{collocationCounts.active}）</button><button aria-pressed={stateView === 'mastered'} onClick={() => setStateView('mastered')}>已掌握（{collocationCounts.mastered}）</button></div><p className="automatic-mastery-note">重点搭配只会通过测试和间隔复习自动掌握；后续答错会自动降回待复习。</p><div className="phrase-list">{filteredCollocations.map((item) => <article key={item.id} className={states.get(item.id)?.status ?? ''}><StatusBadge state={states.get(item.id)} /><h2>{item.phrase}</h2><p>{item.meaningZh}</p><small>{item.example}</small><small>{item.exampleZh}</small></article>)}</div>{filteredCollocations.length === 0 && <p className="empty-result">当前分区没有重点搭配。</p>}</>}
    {tab === 'grammar' && <><p className="automatic-mastery-note">语法掌握状态由专项练习和掌握检测自动更新，不能手动标记。</p><a className="focus-action" href={appHref('practice/grammar')}>开始语法检测 →</a><div className="grammar-grid">{grammarTopics.map((item, index) => <article key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><StatusBadge state={states.get(item.id)} /><h2>{item.title}</h2><p>{item.summary}</p><ul>{item.checklist.map((line) => <li key={line}>{line}</li>)}</ul></article>)}</div></>}
  </section>;
}
