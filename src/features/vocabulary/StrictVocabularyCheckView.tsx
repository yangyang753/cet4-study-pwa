import { useMemo, useState } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { VocabularyEntry } from '../../domain/content';
import type { KnowledgeState } from '../../domain/learning';
import { applyVocabularyReviewResult } from './vocabularySchedule';
import { vocabularyReviewCard } from './wordMastery';
import { buildStrictVocabularyQuestions, gradeStrictVocabularyAnswer } from './strictVocabularyCheck';

export function StrictVocabularyCheck({ repository, words, states, passedWordIds = [], onWordPassed, onComplete }: {
  repository: LearningRepository;
  words: VocabularyEntry[];
  states: KnowledgeState[];
  passedWordIds?: string[];
  onWordPassed?: (wordId: string) => void | Promise<void>;
  onComplete: () => void | Promise<void>;
}) {
  const allQuestions = useMemo(() => buildStrictVocabularyQuestions(words), [words]);
  const [questions] = useState(() => {
    const passed = new Set(passedWordIds);
    return buildStrictVocabularyQuestions(words).filter((item) => !passed.has(item.word.id));
  });
  const [stateById, setStateById] = useState(() => new Map(states.map((state) => [state.itemId, state])));
  const [index, setIndex] = useState(0);
  const [english, setEnglish] = useState('');
  const [chinese, setChinese] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const question = questions[index];

  async function submit() {
    if (!question || saving) return;
    const grade = gradeStrictVocabularyAnswer(question, { english, chinese });
    const now = new Date().toISOString();
    const current = stateById.get(question.word.id);
    setSaving(true);
    try {
      const passedDate = now.slice(0, 10);
      const alreadyPassedToday = grade.correct && current?.lastStrictPassedDate === passedDate;
      const gradedState = alreadyPassedToday ? current : applyVocabularyReviewResult(current ?? {
        id: `knowledge:${question.word.id}`, itemId: question.word.id, status: 'learning', favorite: false, updatedAt: now,
      }, grade.correct, now);
      const nextState = grade.correct
        ? { ...gradedState, lastStrictPassedDate: passedDate }
        : { ...gradedState, lastStrictPassedDate: undefined };
      await repository.upsertKnowledgeState(nextState);
      setStateById((currentStates) => new Map(currentStates).set(question.word.id, nextState));
      if (!grade.spellingCorrect) await repository.upsertReviewCard(vocabularyReviewCard(question.word.id, 'cloze', now));
      if (grade.missingMeanings.length) await repository.upsertReviewCard(vocabularyReviewCard(question.word.id, 'meaning', now));
      if (!grade.correct) {
        const details = [!grade.spellingCorrect ? `正确拼写：${question.word.word}` : '', grade.missingMeanings.length ? `漏译：${grade.missingMeanings.join('、')}` : ''].filter(Boolean).join('；');
        setFeedback(`本题未完全正确，已加入错题复习。${details}。请修改后重新提交。`);
        return;
      }
      await onWordPassed?.(question.word.id);
      setFeedback('回答完整，已记录。');
      if (index >= questions.length - 1) await onComplete();
      else {
        setIndex((value) => value + 1);
        setEnglish(''); setChinese(''); setFeedback('');
      }
    } catch {
      setFeedback('结果保存失败，答案已保留，请重新提交。');
    } finally {
      setSaving(false);
    }
  }

  if (!question) return <section className="vocabulary-warmup complete"><h1>今日新词已全部通过严格检测</h1><button className="primary-action" onClick={() => void onComplete()}>继续今日训练</button></section>;
  const position = allQuestions.findIndex((item) => item.word.id === question.word.id) + 1;
  const needsEnglish = question.kind !== 'meaning';
  const needsChinese = question.kind !== 'spelling';
  return <section className="strict-vocabulary-check">
    <header><span>掌握检测 · {position} / {allQuestions.length}</span><h1>严格检测今日新词</h1><p>拼写必须完全一致，中文词义不能遗漏；答错后改对才能进入下一词。</p></header>
    <article className="warmup-card strict-check-card">
      {question.kind === 'spelling' && <><span className="check-type">看中文，默写英文</span><h2>{question.word.meaningZh}</h2></>}
      {question.kind === 'meaning' && <><span className="check-type">看英文，写全中文词义</span><h2>{question.word.word}</h2></>}
      {question.kind === 'dual' && <><span className="check-type">补齐单词和词义</span><h2>{question.cloze}</h2><p>{question.word.partOfSpeech}</p></>}
      {needsEnglish && <label>英文拼写<input aria-label="英文拼写" autoComplete="off" value={english} onChange={(event) => setEnglish(event.target.value)} /></label>}
      {needsChinese && <label>完整中文词义<textarea aria-label="完整中文词义" value={chinese} onChange={(event) => setChinese(event.target.value)} /></label>}
      {feedback && <p className={feedback.startsWith('回答完整') ? 'strict-success' : 'strict-error'} role="alert">{feedback}</p>}
      <button className="primary-action" disabled={saving || (needsEnglish && !english.trim()) || (needsChinese && !chinese.trim())} onClick={() => void submit()}>{saving ? '正在保存…' : index >= questions.length - 1 ? '提交并完成检测' : '提交严格检测'}</button>
    </article>
  </section>;
}
