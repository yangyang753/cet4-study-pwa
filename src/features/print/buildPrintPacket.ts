import type { Question } from '../../domain/content';

export interface PrintBlock { kind: 'question' | 'writing-space' | 'answer'; questionId: string; title?: string; text: string; options?: string[] }
export interface PrintPage { title: string; blocks: PrintBlock[] }
export interface PrintPacket { questionPages: PrintPage[]; answerPages: PrintPage[] }

export function buildPrintPacket(questions: Question[]): PrintPacket {
  const questionBlocks: PrintBlock[] = [];
  const answerBlocks: PrintBlock[] = [];
  questions.forEach((question, index) => {
    questionBlocks.push({ kind: 'question', questionId: question.id, title: `${index + 1}.`, text: question.prompt, options: 'options' in question ? question.options.map((option) => `${option.id}. ${option.text}`) : undefined });
    if (!('options' in question)) questionBlocks.push({ kind: 'writing-space', questionId: question.id, text: '' });
    answerBlocks.push({ kind: 'answer', questionId: question.id, title: `${index + 1}.`, text: 'correctAnswer' in question ? (Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer) : question.referenceAnswer });
  });
  return { questionPages: [{ title: '大学英语四级基础强化练习', blocks: questionBlocks }], answerPages: [{ title: '答案与解析', blocks: answerBlocks }] };
}
