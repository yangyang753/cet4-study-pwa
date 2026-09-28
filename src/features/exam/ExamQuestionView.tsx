import type { CatalogQuestion, ObjectiveQuestion } from '../../domain/content';
import { ObjectiveQuestion as ObjectiveQuestionView } from '../practice/ObjectiveQuestion';

export function ExamQuestionView({ question, response, onChange }: { question: CatalogQuestion; response: string; onChange: (response: string) => void }) {
  if (!('options' in question)) {
    return <label className="exam-subjective"><strong>{question.prompt}</strong><textarea aria-label={question.type === 'writing' ? '写作答题区' : '翻译答题区'} value={response} onChange={(event) => onChange(event.target.value)} placeholder="答案会自动保存在本机" /></label>;
  }
  if (question.examFormat === 'cloze-bank') return <section className="exam-format exam-cloze">
    <article className="exam-shared-context"><h2>选词填空短文</h2>{question.examContext?.split('\n\n').map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</article>
    <div className="exam-word-bank"><h2>选词填空词库</h2><div>{question.options.map((option) => <span key={option.id}><b>{option.id}</b> {option.text}</span>)}</div></div>
    <label className="exam-select-answer"><strong>{question.prompt}</strong><select aria-label={`空格 ${question.examNumber ?? 1}`} value={response} onChange={(event) => onChange(event.target.value)}><option value="">请选择词库答案</option>{question.options.map((option) => <option key={option.id} value={option.id}>{option.id}. {option.text}</option>)}</select></label>
  </section>;
  if (question.examFormat === 'paragraph-matching') return <section className="exam-format exam-matching">
    <article className="exam-shared-context"><h2>长篇阅读段落</h2>{question.examContext?.split('\n\n').map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</article>
    <ObjectiveQuestionView question={question as ObjectiveQuestion} value={response} disabled={false} onChange={onChange} />
  </section>;
  return <>{question.passage && <article className="exam-passage">{question.passage}</article>}<ObjectiveQuestionView question={question as ObjectiveQuestion} value={response} disabled={false} onChange={onChange} /></>;
}
