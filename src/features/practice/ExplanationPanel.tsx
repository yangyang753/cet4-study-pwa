import type { Question } from '../../domain/content';
import type { MistakeReason } from '../../domain/attempt';

const reasons = [['unknown', '不认识'], ['misunderstood', '没理解'], ['location', '定位错误'], ['guessed', '蒙对'], ['careless', '粗心'], ['overtime', '超时']] as const;

export function ExplanationPanel({ question, correct, onReason, selectedReason }: { question: Question; correct: boolean; onReason?: (reason: MistakeReason) => void; selectedReason?: MistakeReason }) {
  return <section className={correct ? 'explanation correct' : 'explanation incorrect'} aria-live="polite"><h2>{correct ? '回答正确' : '再看一遍解析'}</h2><p>{question.explanationZh}</p><h3>这道题的情况</h3><div className="reason-row">{reasons.map(([value, label]) => <button key={value} type="button" aria-pressed={selectedReason === value} disabled={!onReason} onClick={() => onReason?.(value as MistakeReason)}>{label}</button>)}</div>{selectedReason && <small>已记录，将用于安排后续复习。</small>}</section>;
}
