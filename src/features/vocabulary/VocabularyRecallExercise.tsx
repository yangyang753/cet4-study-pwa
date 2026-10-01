import { useState } from 'react';
import type { StrictVocabularyGrade } from './strictVocabularyCheck';
import { requiredMeanings } from './strictVocabularyCheck';
import { gradeWordReinforcement, type WordReinforcement } from '../knowledge/wordReinforcement';

export interface VocabularyRecallSubmission {
  answer: { english: string; chinese: string };
  grade: StrictVocabularyGrade;
}

export function forgottenWordReinforcementGrade(exercise: WordReinforcement): StrictVocabularyGrade {
  const needsEnglish = exercise.kind !== 'meaning';
  const needsChinese = exercise.kind === 'meaning' || exercise.kind === 'dual';
  return {
    correct: false,
    spellingCorrect: !needsEnglish,
    missingMeanings: needsChinese ? requiredMeanings(exercise.word) : [],
    unexpectedMeanings: [],
  };
}

export function VocabularyRecallExercise({ exercise, result = null, feedback = '', submitLabel = '提交词汇复习', onSubmit, onForgotten }: {
  exercise: WordReinforcement;
  result?: 'correct' | 'incorrect' | null;
  feedback?: string;
  submitLabel?: string;
  onSubmit: (submission: VocabularyRecallSubmission) => void | Promise<void>;
  onForgotten?: (grade: StrictVocabularyGrade) => void | Promise<void>;
}) {
  const [english, setEnglish] = useState('');
  const [chinese, setChinese] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const needsEnglish = exercise.kind !== 'meaning';
  const needsChinese = exercise.kind === 'meaning' || exercise.kind === 'dual';

  async function submit() {
    if (saving || result || (needsEnglish && !english.trim()) || (needsChinese && !chinese.trim())) return;
    const answer = { english, chinese };
    setSaving(true); setSaveError('');
    try { await onSubmit({ answer, grade: gradeWordReinforcement(exercise, answer) }); }
    catch { setSaveError('复习结果保存失败，答案已保留，请重新保存。'); }
    finally { setSaving(false); }
  }

  async function forgotten() {
    if (!onForgotten || saving || result) return;
    setSaving(true); setSaveError('');
    try { await onForgotten(forgottenWordReinforcementGrade(exercise)); }
    catch { setSaveError('复习结果保存失败，请重试。'); }
    finally { setSaving(false); }
  }

  return <article className="warmup-card review-practice-panel vocabulary-recall-exercise">
    <span className="review-kind">词汇 · {exercise.kind === 'meaning' ? '完整释义' : exercise.kind === 'spelling' ? '完整拼写' : exercise.kind === 'cloze' ? '随机挖空' : '双重检测'}</span>
    {exercise.kind === 'meaning' && <><h2>{exercise.word.word}</h2><p>{exercise.word.phonetic}</p><p>请写出全部中文释义，不能漏译或多写。</p></>}
    {exercise.kind === 'spelling' && <><h2>{exercise.word.meaningZh}</h2><p>根据中文写出完整英文单词。</p></>}
    {exercise.kind === 'cloze' && <><h2>{exercise.cloze}</h2><p>{exercise.word.meaningZh}</p><p>补全所有随机缺失的字母。</p></>}
    {exercise.kind === 'dual' && <><h2>{exercise.cloze}</h2><p>补全英文，并写出这个单词的全部中文释义。</p></>}
    {needsEnglish && <label className="review-spelling-field">英文答案<input aria-label="英文答案" autoComplete="off" value={english} disabled={Boolean(result) || saving} onChange={(event) => setEnglish(event.target.value)} /></label>}
    {needsChinese && <label className="review-spelling-field">中文释义答案<textarea aria-label="中文释义答案" rows={4} value={chinese} disabled={Boolean(result) || saving} onChange={(event) => setChinese(event.target.value)} /></label>}
    {saveError && <p role="alert">{saveError}</p>}
    {!result && <div className="vocabulary-recall-actions">{onForgotten && <button disabled={saving} onClick={() => void forgotten()}>想不起来</button>}<button className="review-primary-button" disabled={saving || (needsEnglish && !english.trim()) || (needsChinese && !chinese.trim())} onClick={() => void submit()}>{saveError ? '重新保存词汇复习' : saving ? '正在保存…' : submitLabel}</button></div>}
    {result && <div className={`review-result review-result-${result}`} role="status"><strong>{result === 'correct' ? '复习正确' : '复习错误'}</strong><p>{feedback}</p></div>}
  </article>;
}
