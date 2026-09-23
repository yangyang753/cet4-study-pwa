import { contentCatalog, getPracticeItems } from '../../content/catalog';
import type { CatalogQuestion, PracticeKind } from '../../domain/content';
import { resolveExam } from '../exam/examBlueprint';

export type PrintPacketKind = 'daily' | 'practice' | 'mock';
export interface PrintPacketOptions { kind: PrintPacketKind; sourceId?: string; questions?: CatalogQuestion[]; includeKnowledge?: boolean; pageCapacity?: number }
export interface PrintBlock { kind: 'question' | 'writing-space' | 'answer' | 'knowledge'; questionId: string; title?: string; text: string; options?: string[]; answer?: string; explanation?: string; weight: number }
export interface PrintPage { title: string; blocks: PrintBlock[]; pageNumber: number; totalPages: number }
export interface PrintPacket { pages: PrintPage[]; questionPages: PrintPage[]; answerPages: PrintPage[]; questionCount: number }

const practiceKinds: PracticeKind[] = ['vocabulary', 'grammar', 'listening', 'reading', 'translation', 'writing'];

function resolveQuestions(options: PrintPacketOptions): CatalogQuestion[] {
  if (options.questions) return options.questions;
  if (options.kind === 'mock') return resolveExam(options.sourceId ?? 'mock-1').sections.flatMap((section) => section.questions);
  if (options.kind === 'practice') {
    const kind = practiceKinds.includes(options.sourceId as PracticeKind) ? options.sourceId as PracticeKind : 'reading';
    return getPracticeItems(kind).slice(0, kind === 'vocabulary' ? 20 : 12);
  }
  return [
    ...getPracticeItems('vocabulary').slice(0, 5),
    ...getPracticeItems('grammar').slice(0, 3),
    ...getPracticeItems('listening').slice(0, 2),
    ...getPracticeItems('reading').slice(0, 2),
    ...getPracticeItems('writing').slice(0, 1),
    ...getPracticeItems('translation').slice(0, 1),
  ];
}

function paginate(blocks: PrintBlock[], title: string, capacity: number): Omit<PrintPage, 'pageNumber' | 'totalPages'>[] {
  const pages: Omit<PrintPage, 'pageNumber' | 'totalPages'>[] = [];
  let current: PrintBlock[] = [];
  let used = 0;
  for (const block of blocks) {
    if (current.length && used + block.weight > capacity) { pages.push({ title, blocks: current }); current = []; used = 0; }
    current.push(block);
    used += block.weight;
  }
  if (current.length) pages.push({ title, blocks: current });
  return pages;
}

function splitExplanation(text: string, capacity: number) {
  const maximumCharacters = Math.max(120, capacity * 150);
  const parts: string[] = [];
  for (let index = 0; index < text.length; index += maximumCharacters) parts.push(text.slice(index, index + maximumCharacters));
  return parts.length ? parts : ['暂无解析。'];
}

function knowledgeBlocks(): PrintBlock[] {
  const vocabulary = contentCatalog.vocabulary.slice(0, 24).map((item, index) => ({ kind: 'knowledge' as const, questionId: `knowledge:${item.id}`, title: `${index + 1}. ${item.word} ${item.phonetic}`, text: item.meaningZh, weight: 1 }));
  const grammar = contentCatalog.grammar.slice(0, 8).map((item, index) => ({ kind: 'knowledge' as const, questionId: `knowledge:${item.id}`, title: `${index + 1}. ${item.title}`, text: `${item.summary} ${item.checklist.join('；')}`, weight: 2 }));
  return [...vocabulary, ...grammar];
}

export function buildPrintPacket(options: PrintPacketOptions): PrintPacket {
  const capacity = Math.max(2, options.pageCapacity ?? 8);
  const questions = resolveQuestions(options);
  const questionBlocks: PrintBlock[] = options.includeKnowledge ? knowledgeBlocks() : [];
  const answerBlocks: PrintBlock[] = [];
  questions.forEach((question, index) => {
    const number = `${index + 1}.`;
    questionBlocks.push({ kind: 'question', questionId: question.id, title: number, text: question.prompt, options: 'options' in question ? question.options.map((option) => `${option.id}. ${option.text}`) : undefined, weight: Math.min(capacity, 'options' in question ? 2 : 1) });
    if (!('options' in question)) questionBlocks.push({ kind: 'writing-space', questionId: question.id, text: '', weight: Math.min(capacity, question.type === 'writing' ? 5 : 4) });
    const answer = 'correctAnswer' in question ? (Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : question.correctAnswer) : question.referenceAnswer;
    splitExplanation(question.explanationZh, capacity).forEach((explanation, partIndex) => answerBlocks.push({ kind: 'answer', questionId: `${question.id}:${partIndex}`, title: partIndex === 0 ? number : `${number}（解析续）`, text: question.prompt, answer: partIndex === 0 ? answer : undefined, explanation, weight: Math.min(capacity, Math.max(1, Math.ceil(explanation.length / 150))) }));
  });
  const rawQuestionPages = paginate(questionBlocks, options.includeKnowledge ? '高频知识与四级练习' : '大学英语四级原创仿真练习', capacity);
  const rawAnswerPages = paginate(answerBlocks, '答案与解析', capacity);
  const totalPages = rawQuestionPages.length + rawAnswerPages.length;
  const numbered = [...rawQuestionPages, ...rawAnswerPages].map((page, index) => ({ ...page, pageNumber: index + 1, totalPages }));
  const questionPages = numbered.slice(0, rawQuestionPages.length);
  const answerPages = numbered.slice(rawQuestionPages.length);
  return { pages: numbered, questionPages, answerPages, questionCount: questions.length };
}
