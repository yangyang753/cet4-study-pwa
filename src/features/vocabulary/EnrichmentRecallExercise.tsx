import { useMemo, useState } from 'react';
import type { VocabularyEnrichment, VocabularyEntry } from '../../domain/content';

export interface EnrichmentRecallSubmission {
  correct: boolean;
  vocabularyId: string;
  answer: string;
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function blankTarget(example: string, target: string) {
  return example.replace(new RegExp(`\\b${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), '_____');
}

export function EnrichmentRecallExercise({ word, enrichment, random = Math.random, onSubmit }: {
  word: VocabularyEntry;
  enrichment: VocabularyEnrichment;
  random?: () => number;
  onSubmit: (submission: EnrichmentRecallSubmission) => void | Promise<void>;
}) {
  const mode = useMemo(() => enrichment.family.length && (!enrichment.confusables.length || random() < 0.5) ? 'family' : 'confusable', [enrichment, random]);
  const family = enrichment.family[0];
  const confusable = enrichment.confusables[0];
  const target = mode === 'family' ? family?.word : confusable?.word;
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!target || !answer.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSubmit({ correct: normalize(answer) === normalize(target), vocabularyId: word.id, answer: answer.trim() });
    } catch {
      setError('巩固结果保存失败，答案已保留，请重试。');
    } finally {
      setSaving(false);
    }
  }

  if (!target) return null;
  const label = mode === 'family' ? '词族答案' : '易混词答案';
  return <article className="warmup-card enrichment-recall-exercise">
    <span className="review-kind">词汇拓展 · {mode === 'family' ? '词族变换' : '易混辨析'}</span>
    {mode === 'family'
      ? <><h2>把 {word.word} 改写成{family.partOfSpeech.includes('n.') ? '名词' : family.partOfSpeech.includes('a.') ? '形容词' : family.partOfSpeech.includes('ad.') ? '副词' : '对应形式'}</h2><p>目标词义：{family.meaningZh}</p></>
      : <><h2>{blankTarget(confusable.example, confusable.word)}</h2><p>{confusable.distinctionZh.replace(new RegExp(confusable.word, 'ig'), '目标词')}</p></>}
    <label>{label}<input aria-label={label} autoComplete="off" value={answer} disabled={saving} onChange={(event) => setAnswer(event.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <button className="primary-action" disabled={saving || !answer.trim()} onClick={() => void submit()}>{saving ? '正在保存…' : `提交${mode === 'family' ? '词族' : '易混词'}巩固`}</button>
  </article>;
}
