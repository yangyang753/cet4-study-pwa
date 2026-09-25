import { useMemo, useState } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { SubjectiveQuestion } from '../../domain/content';
import { countEnglishWords } from '../composition/validateSubjectiveSubmission';
import { recordMasteryOutcome } from './taskProgress';

export interface MasteryEvidenceCheck { label: string; passed: boolean; hint: string }

const completeSentence = (body: string) => /[.!?。！？]\s*$/.test(body.trim());
const sentenceCount = (body: string) => body.split(/[.!?。！？]+/).filter((sentence) => sentence.trim()).length;
const referenceKeywords = (question: SubjectiveQuestion) => [...new Set(question.referenceAnswer.toLowerCase().match(/[a-z]{5,}/g) ?? [])]
  .filter((word) => !['because', 'their', 'about', 'which', 'these', 'those', 'there', 'would', 'could', 'should'].includes(word))
  .slice(0, 6);

export function evaluateSubjectiveMastery(kind: 'writing' | 'translation', body: string, question: SubjectiveQuestion): MasteryEvidenceCheck[] {
  const words = countEnglishWords(body);
  const normalized = body.toLowerCase();
  if (kind === 'writing') return [
    { label: '微段落篇幅', passed: words >= 30 && words <= 60, hint: '用 30～60 词写一个完整微段落。' },
    { label: '观点与展开', passed: sentenceCount(body) >= 2, hint: '至少写两句：一句观点，一句理由或例子。' },
    { label: '逻辑连接', passed: /\b(because|however|therefore|moreover|for example|as a result)\b/i.test(body), hint: '加入 because、however、therefore 等连接表达。' },
    { label: '句子完整', passed: completeSentence(body), hint: '补全句子并添加结尾标点。' },
  ];
  const keywords = referenceKeywords(question);
  const covered = keywords.filter((keyword) => normalized.includes(keyword)).length;
  return [
    { label: '基本篇幅', passed: words >= 15, hint: '译文至少写 15 个英文单词。' },
    { label: '核心信息', passed: covered >= Math.min(3, keywords.length), hint: `重新检查核心表达：${keywords.slice(0, 4).join('、')}。` },
    { label: '谓语结构', passed: /\b(is|are|was|were|has|have|had|will|can|want|wants|help|helps|take|takes|make|makes)\b/i.test(body), hint: '检查主语后是否有正确的谓语动词。' },
    { label: '句子完整', passed: completeSentence(body), hint: '补全译文并添加结尾标点。' },
  ];
}

const defaultRepository = new DexieLearningRepository();

export function SubjectiveMasteryCheck({ kind, taskId, question, repository = defaultRepository, now = new Date().toISOString() }: { kind: 'writing' | 'translation'; taskId: string; question: SubjectiveQuestion; repository?: LearningRepository; now?: string }) {
  const [body, setBody] = useState('');
  const [finished, setFinished] = useState<'mastered' | 'review' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const checks = useMemo(() => evaluateSubjectiveMastery(kind, body, question), [body, kind, question]);

  async function submit() {
    if (!body.trim() || saving) return;
    setSaving(true);
    setSaveError('');
    const passedCount = checks.filter((check) => check.passed).length;
    const passed = passedCount / checks.length >= 0.8;
    try {
      await repository.saveAttemptOnce({
        id: crypto.randomUUID(), userId: 'local-learner', questionId: question.id, response: body,
        correct: passed, score: passedCount / checks.length, durationSeconds: 0, contentVersion: 'v1',
        kind, mode: 'mastery', deviceId: localStorage.getItem('cet4:device-id') ?? 'local-device', createdAt: now,
      });
      if (!passed) await repository.upsertReviewCard({ id: `review:${question.id}`, questionId: question.id, stage: 0, nextReviewAt: now, lastCorrect: false, updatedAt: now });
      const outcome = await recordMasteryOutcome(repository, taskId, passedCount, checks.length, now);
      setFinished(outcome === 'mastered' ? 'mastered' : 'review');
    } catch {
      setSaveError('保存失败，文字已保留，请再次提交。');
    } finally {
      setSaving(false);
    }
  }

  if (finished) return <section className={`mastery-result ${finished}`}><h1>{finished === 'mastered' ? '已完全掌握' : '需要继续复习'}</h1><p>{finished === 'mastered' ? '书面证明达到 80%，今日任务已真正掌握。' : '书面证明中还有薄弱点，题目已自动加入复习安排。'}</p><a href={`${import.meta.env.BASE_URL}today`}>返回今日计划</a></section>;

  return <section className="mastery-check subjective-mastery"><header><span>掌握度检测</span><h1>{kind === 'writing' ? '用一个微段落证明你会写' : '不看答案，再译一次关键句'}</h1><p>{kind === 'writing' ? '不用重写全文，请写 30～60 词，包含观点、理由和连接词。' : question.prompt}</p></header><label>{kind === 'writing' ? '写作掌握证明' : '翻译掌握证明'}<textarea aria-label={kind === 'writing' ? '写作掌握证明' : '翻译掌握证明'} value={body} onChange={(event) => { setBody(event.target.value); setSaveError(''); }} /></label><ul className="mastery-rules">{checks.map((check) => <li key={check.label} className={check.passed ? 'passed' : ''}><strong>{check.passed ? '✓' : '○'} {check.label}</strong><span>{check.passed ? '已达到' : check.hint}</span></li>)}</ul>{saveError && <p role="alert">{saveError}</p>}<button className="primary-action" disabled={!body.trim() || saving} onClick={() => void submit()}>检查是否掌握</button></section>;
}
