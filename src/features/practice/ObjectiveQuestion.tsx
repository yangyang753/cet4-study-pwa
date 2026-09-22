import type { ObjectiveQuestion as ObjectiveQuestionType } from '../../domain/content';

export function ObjectiveQuestion({ question, value, disabled, onChange }: { question: ObjectiveQuestionType; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return <fieldset disabled={disabled}><legend>{question.prompt}</legend>{question.options.map((option) => <label key={option.id} className="answer-option"><input type="radio" name={question.id} value={option.id} checked={value === option.id} onChange={() => onChange(option.id)} /><b>{option.id}</b><span>{option.text}</span></label>)}</fieldset>;
}
