import type { CatalogQuestion, ObjectiveQuestion, QuestionOption } from '../../domain/content';

const optionId = (index: number) => String.fromCharCode(65 + index);
const correctText = (question: CatalogQuestion) => {
  if (!('options' in question) || typeof question.correctAnswer !== 'string') return '';
  return question.options.find((option) => option.id === question.correctAnswer)?.text ?? '';
};

function clozeContext(questions: CatalogQuestion[]) {
  const onePassage = questions[0]?.passage?.trim();
  if (onePassage && questions.every((question) => question.passage?.trim() === onePassage)) {
    let context = onePassage;
    questions.forEach((question, index) => {
      const answer = correctText(question);
      const pattern = new RegExp(`\\b${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      context = pattern.test(context) ? context.replace(pattern, `[${index + 1}]`) : `${context} [${index + 1}]`;
    });
    return context;
  }
  return questions.map((question, index) => {
    const answer = correctText(question);
    const source = question.passage?.trim() || question.prompt;
    if (answer && source.toLowerCase().includes(answer.toLowerCase())) {
      const position = source.toLowerCase().indexOf(answer.toLowerCase());
      return source.slice(0, position) + `[${index + 1}]` + source.slice(position + answer.length);
    }
    return `${source} [${index + 1}]`;
  }).join('\n\n');
}

export function formatOfficialReadingQuestions(questions: CatalogQuestion[]): CatalogQuestion[] {
  const cloze = questions.filter((question) => question.type === 'cloze');
  const matching = questions.filter((question) => question.type === 'matching');
  const carefulReading = questions.filter((question) => question.type === 'reading');

  const bankTexts = [...new Set([
    ...cloze.map(correctText),
    ...cloze.flatMap((question) => 'options' in question ? question.options.map((option) => option.text) : []),
  ].filter(Boolean))].slice(0, 15);
  for (let index = 0; bankTexts.length < 15; index += 1) bankTexts.push(`context choice ${index + 1}`);
  const bank: QuestionOption[] = bankTexts.map((text, index) => ({ id: optionId(index), text }));
  const sharedClozeContext = clozeContext(cloze);
  const formattedCloze = cloze.map((question, index) => ({
    ...question,
    prompt: `空格 ${index + 1}：${question.prompt}`,
    options: bank,
    correctAnswer: bank.find((option) => option.text === correctText(question))?.id ?? 'A',
    examFormat: 'cloze-bank' as const,
    examContext: sharedClozeContext,
    examNumber: index + 1,
  })) as CatalogQuestion[];

  const labels = matching.map((_, index) => optionId(index));
  const matchingOptions = labels.map((id) => ({ id, text: `段落 ${id}` }));
  const matchingContext = matching.map((question, index) => `[${labels[index]}] ${question.passage ?? question.prompt}`).join('\n\n');
  const formattedMatching = matching.map((question, index) => ({
    ...question,
    options: matchingOptions,
    correctAnswer: labels[index],
    examFormat: 'paragraph-matching' as const,
    examContext: matchingContext,
    examNumber: index + 1,
  })) as CatalogQuestion[];

  return [...formattedCloze, ...formattedMatching, ...carefulReading];
}

export function isFormattedObjective(question: CatalogQuestion): question is CatalogQuestion & ObjectiveQuestion {
  return 'options' in question;
}
