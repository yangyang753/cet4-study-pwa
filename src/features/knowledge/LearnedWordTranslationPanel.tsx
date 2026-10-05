import { useState } from 'react';
import type { VocabularyEntry } from '../../domain/content';
import { createId } from '../../lib/createId';
import { buildLearnedWordTranslation, gradeLearnedWordTranslation, type LearnedWordTranslationExercise, type LearnedWordTranslationGrade, type LearnedWordTranslationMode } from './learnedWordTranslation';

export interface LearnedWordTranslationSubmission {
  attemptId: string;
  exercise: LearnedWordTranslationExercise;
  answer: string;
  grade: LearnedWordTranslationGrade;
}

export function LearnedWordTranslationPanel({ learnedWords, random = Math.random, onSubmit }: {
  learnedWords: VocabularyEntry[];
  random?: () => number;
  onSubmit: (submission: LearnedWordTranslationSubmission) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<LearnedWordTranslationMode>('single');
  const [exercise, setExercise] = useState<LearnedWordTranslationExercise | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<LearnedWordTranslationGrade | null>(null);
  const [attemptId, setAttemptId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [recentExerciseIds, setRecentExerciseIds] = useState<string[]>([]);

  const start = (nextMode: LearnedWordTranslationMode) => {
    const next = buildLearnedWordTranslation(learnedWords, nextMode, random, recentExerciseIds);
    if (!next) return;
    setRecentExerciseIds((current) => [...current.filter((id) => id !== next.id), next.id].slice(-12));
    setMode(nextMode);
    setExercise(next);
    setAnswer('');
    setResult(null);
    setAttemptId(createId());
    setSaveError('');
  };

  const submit = async () => {
    if (!exercise || !answer.trim() || saving) return;
    const grade = gradeLearnedWordTranslation(exercise, answer);
    setSaving(true);
    setSaveError('');
    try {
      await onSubmit({ attemptId: attemptId || createId(), exercise, answer, grade });
      setResult(grade);
    } catch {
      setSaveError('保存失败，答案已保留，请重新保存。');
    } finally {
      setSaving(false);
    }
  };

  return <section className="learned-translation" aria-labelledby="learned-translation-title">
    <header>
      <div><span>ACTIVE USE · 已学词输出</span><h2 id="learned-translation-title">已学词短句中译英</h2><p>每次只译一个短句；优先使用中国文化语境。答不出的目标词会进入中译英错题复习。</p></div>
      <b>{learnedWords.length}<small> 个已学词可用</small></b>
    </header>
    <div className="learned-translation-modes" role="group" aria-label="中译英目标数量">
      <button aria-pressed={mode === 'single'} disabled={!learnedWords.length || saving} onClick={() => start('single')}>开始单词短句</button>
      <button aria-pressed={mode === 'multi'} disabled={learnedWords.length < 2 || saving} onClick={() => start('multi')}>开始多词短句</button>
    </div>
    {!learnedWords.length && <p className="learned-translation-empty">先完成新词学习，系统会从已学词中出题。</p>}
    {exercise && <article className="learned-translation-task">
      <span>{exercise.theme} · 检测 {exercise.targets.length} 个已学词</span>
      <strong>{exercise.promptZh}</strong>
      <label>你的英文短句<textarea aria-label="英文短句答案" rows={3} value={answer} disabled={saving || result !== null} onChange={(event) => setAnswer(event.target.value)} placeholder="写出完整英文短句" /></label>
      {saveError && <p role="alert" className="learned-translation-error">{saveError}</p>}
      {result && <div className={result.correct ? 'learned-translation-success' : 'learned-translation-error'} role="status">
        <b>{result.correct ? '本题通过，已记录主动运用。' : `${result.sentenceComplete && result.meaningComplete ? result.missingWordIds.length : exercise.targets.length} 个目标词已加入中译英错题复习。`}</b>
        {!result.sentenceComplete && <p>请写成一个完整英文短句，不要只罗列单词。</p>}
        {result.sentenceComplete && !result.meaningComplete && <p>目标词虽然出现了，但句意与中文题目不符，请按完整意思重新学习。</p>}
        <p>参考表达：{exercise.referenceAnswer}</p>
      </div>}
      {!result ? <button className="learned-translation-submit" disabled={!answer.trim() || saving} onClick={() => void submit()}>{saveError ? '重新保存中译英' : saving ? '正在保存…' : '提交中译英'}</button> : <button className="learned-translation-next" onClick={() => start(mode)}>再来一道</button>}
    </article>}
  </section>;
}
