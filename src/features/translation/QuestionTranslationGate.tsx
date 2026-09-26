import { useEffect, useMemo, useState } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { learningVocabulary } from '../../content/vocabularyLearning';
import type { ObjectiveQuestion, VocabularyEntry } from '../../domain/content';
import type { KnowledgeState } from '../../domain/learning';
import { evaluateTranslation, type TranslationEvaluation } from './evaluateTranslation';
import { recordTranslationResult, vocabularyReviewCard } from '../vocabulary/wordMastery';

const defaultVocabulary = learningVocabulary;
const containsEnglish = (text: string) => /[A-Za-z]/.test(text.replace(/(?:prep|pron|conj|modal|adj|adv|num|art|aux|vt|vi|ad|n|v|a)\./gi, ''));

export function questionNeedsTranslation(question: ObjectiveQuestion): boolean {
  return [question.prompt, ...question.options.map((option) => option.text)].some(containsEnglish);
}

export function QuestionTranslationGate({ question, repository, vocabulary = defaultVocabulary, onUnlocked }: {
  question: ObjectiveQuestion;
  repository: LearningRepository;
  vocabulary?: VocabularyEntry[];
  onUnlocked: (evaluation: TranslationEvaluation) => void;
}) {
  const required = useMemo(() => [
    { id: 'stem', label: '题干', text: question.prompt },
    ...question.options.map((option) => ({ id: option.id, label: `选项 ${option.id}`, text: option.text })),
  ].filter((segment) => containsEnglish(segment.text)), [question]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [states, setStates] = useState<Map<string, KnowledgeState>>(() => new Map());
  const [evaluation, setEvaluation] = useState<TranslationEvaluation | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadedRepository, setLoadedRepository] = useState<LearningRepository | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const knowledgeReady = loadedRepository === repository;

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const snapshot = await repository.getDashboardSnapshot();
        if (active) setStates(new Map(snapshot.knowledgeStates.map((state) => [state.itemId, state])));
      } catch {
        // The translation gate still works when prior state cannot be read.
      } finally {
        if (active) setLoadedRepository(repository);
      }
    })();
    return () => { active = false; };
  }, [repository]);

  async function persistAndUnlock(result: TranslationEvaluation) {
    setSaving(true);
    setError('');
    const uniqueMisses = [...new Map(result.missedWords.map((word) => [word.id, word])).values()];
    try {
      const now = new Date().toISOString();
      await Promise.all(uniqueMisses.flatMap((word) => [
        repository.upsertKnowledgeState(recordTranslationResult(states.get(word.id), word.id, false, now)),
        repository.upsertReviewCard(vocabularyReviewCard(word.id, 'cloze', now)),
      ]));
      setUnlocked(true);
      onUnlocked(result);
    } catch {
      setError('错词保存失败，翻译内容已保留。请重新保存后再作答。');
    } finally {
      setSaving(false);
    }
  }

  function check() {
    const segments = required.map((segment) => ({ ...segment, translation: translations[segment.id] ?? '' }));
    const result = evaluateTranslation(segments, vocabulary);
    if (!result.complete) {
      setError('请先填写题干和所有英文选项的中文翻译，请使用中文填写。');
      return;
    }
    setEvaluation(result);
    void persistAndUnlock(result);
  }

  if (required.length === 0) return null;

  const missed = evaluation ? [...new Map(evaluation.missedWords.map((word) => [word.id, word])).values()] : [];
  return <section className={`translation-gate ${unlocked ? 'unlocked' : ''}`} aria-labelledby={`translation-title-${question.id}`}>
    <header><span>作答前一步</span><h2 id={`translation-title-${question.id}`}>先翻译，再选择答案</h2><p>系统检查高频词义是否覆盖，不等同于人工翻译评分。</p></header>
    {required.map((segment) => <label key={segment.id} className="translation-field"><strong>{segment.label}</strong><span>{segment.text}</span><textarea aria-label={segment.id === 'stem' ? '题干中文翻译' : `${segment.label} 中文翻译`} value={translations[segment.id] ?? ''} disabled={unlocked} onChange={(event) => setTranslations((current) => ({ ...current, [segment.id]: event.target.value }))} placeholder="填写中文翻译" /></label>)}
    {!unlocked && !error.includes('错词保存失败') && <button className="primary-action" disabled={saving || !knowledgeReady} onClick={check}>{!knowledgeReady ? '正在读取单词状态…' : saving ? '正在检查…' : '检查翻译并解锁选项'}</button>}
    {error && <p role="alert">{error}</p>}
    {error.includes('错词保存失败') && evaluation && <button disabled={saving} onClick={() => void persistAndUnlock(evaluation)}>{saving ? '正在保存…' : '重新保存并解锁'}</button>}
    {evaluation && unlocked && <div className="translation-result" role="status"><p>已识别 {new Set(evaluation.auditableWords.map((word) => word.id)).size} 个高频词，覆盖 {new Set(evaluation.coveredWords.map((word) => word.id)).size} 个。</p>{missed.length ? <><strong>已加入待掌握单词</strong><ul>{missed.map((word) => <li key={word.id}><b>{word.word}</b><span>{word.meaningZh}</span></li>)}</ul></> : <strong>高频词义覆盖通过，可以开始作答。</strong>}</div>}
  </section>;
}
