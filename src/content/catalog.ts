import vocabularyData from '../../content/v1/vocabulary.json';
import collocationData from '../../content/v1/collocations.json';
import grammarData from '../../content/v1/grammarTopics.json';
import listeningData from '../../content/v1/listeningSets.json';
import readingData from '../../content/v1/readingSets.json';
import translationData from '../../content/v1/translations.json';
import writingData from '../../content/v1/writingPrompts.json';
import mockData from '../../content/v1/mockExams.json';
import type { CatalogMockExam, CatalogQuestion, Difficulty, PracticeKind, VocabularyEntry } from '../domain/content';

const optionId = (index: number) => String.fromCharCode(65 + index);
const difficulty = (value: string): Difficulty => value === 'standard' || value === 'challenge' ? value : 'foundation';
const listeningType = (value: string): 'news' | 'conversation' | 'passage' => value === 'conversation' || value === 'passage' ? value : 'news';
const readingType = (value: string): 'cloze' | 'matching' | 'reading' => value === 'cloze' || value === 'matching' ? value : 'reading';

const listeningKnowledgePoints = ['主旨理解', '因果关系', '转折定位', '时间细节', '事实细节', '否定信息', '后续行动'];
const readingKnowledgePoints = ['主旨概括', '时间定位', '数字定位', '事实细节', '转折定位', '措施匹配'];

function listeningQuestions(): CatalogQuestion[] {
  return listeningData.flatMap((set) => set.questions.map((question, index) => ({
    id: `${set.id}:q${index + 1}`,
    version: 1,
    type: listeningType(set.type),
    difficulty: difficulty(set.difficulty),
    prompt: question.prompt,
    knowledgePointIds: [listeningKnowledgePoints[index] ?? `听力:${set.type}`],
    explanationZh: question.explanationZh,
    sourceNote: '依据 CET-4 题型与高频考点编写的原创仿真练习',
    options: question.options.map((text, optionIndex) => ({ id: optionId(optionIndex), text })),
    correctAnswer: optionId(question.answer),
    audioAssetId: set.id,
    audioSrc: set.audioSrc,
    groupId: set.id,
  })));
}

function readingQuestions(): CatalogQuestion[] {
  return readingData.flatMap((set) => set.questions.map((question, index) => ({
    id: `${set.id}:q${index + 1}`,
    version: 1,
    type: readingType(set.type),
    difficulty: difficulty(set.difficulty),
    prompt: question.prompt,
    knowledgePointIds: [readingKnowledgePoints[index] ?? `阅读:${set.type}`],
    explanationZh: question.explanationZh,
    sourceNote: '依据 CET-4 题型与高频考点编写的原创仿真练习',
    options: question.options.map((text, optionIndex) => ({ id: optionId(optionIndex), text })),
    correctAnswer: optionId(question.answer),
    passage: set.passage,
    groupId: set.id,
  })));
}

const translationQuestions: CatalogQuestion[] = translationData.map((item) => ({
  id: item.id,
  version: 1,
  type: 'translation',
  difficulty: 'foundation',
  prompt: item.prompt,
  knowledgePointIds: ['translation:paragraph'],
  explanationZh: item.rubric.join('；'),
  sourceNote: '依据 CET-4 题型与高频考点编写的原创仿真练习',
  rubric: item.rubric,
  referenceAnswer: item.referenceAnswer,
  groupId: item.id,
}));

const writingQuestions: CatalogQuestion[] = writingData.map((item) => ({
  id: item.id,
  version: 1,
  type: 'writing',
  difficulty: 'foundation',
  prompt: item.prompt,
  knowledgePointIds: ['writing:essay'],
  explanationZh: item.outline.join('；'),
  sourceNote: '依据 CET-4 题型与高频考点编写的原创仿真练习',
  rubric: item.outline,
  referenceAnswer: item.referenceOpening,
  groupId: item.id,
}));

const vocabularyQuestions: CatalogQuestion[] = vocabularyData.map((item, index) => {
  const distractors = [1, 2, 3].map((offset) => vocabularyData[(index + offset) % vocabularyData.length].meaningZh);
  return {
    id: `${item.id}:meaning`,
    version: 1,
    type: 'vocabulary',
    difficulty: 'foundation',
    prompt: `请选择 ${item.word} 的正确含义。`,
    knowledgePointIds: [`vocabulary:${item.id}`],
    explanationZh: `${item.word} ${item.partOfSpeech} ${item.meaningZh}。例句：${item.example}`,
    sourceNote: '依据 CET-4 高频词汇编写的原创练习',
    options: [item.meaningZh, ...distractors].map((text, optionIndex) => ({ id: optionId(optionIndex), text })),
    correctAnswer: 'A',
    groupId: item.id,
  };
});

const grammarQuestions: CatalogQuestion[] = grammarData.map((item) => ({
  id: `${item.id}:check`,
  version: 1,
  type: 'vocabulary',
  difficulty: 'foundation',
  prompt: `${item.title}：请选择首先应执行的检查步骤。`,
  knowledgePointIds: [`grammar:${item.id}`],
  explanationZh: `${item.summary} ${item.checklist.join('；')}`,
  sourceNote: '依据 CET-4 高频语法考点编写的原创练习',
  options: item.checklist.map((text, optionIndex) => ({ id: optionId(optionIndex), text })),
  correctAnswer: 'A',
  groupId: item.id,
}));

const listening = listeningQuestions();
const reading = readingQuestions();

export const contentCatalog = {
  vocabulary: vocabularyData as VocabularyEntry[],
  collocations: collocationData,
  grammar: grammarData,
  listening: listeningData,
  reading: readingData,
  translation: translationData,
  writing: writingData,
  mocks: mockData as CatalogMockExam[],
};

const questionsByKind: Record<PracticeKind, CatalogQuestion[]> = {
  vocabulary: vocabularyQuestions,
  grammar: grammarQuestions,
  listening,
  reading,
  translation: translationQuestions,
  writing: writingQuestions,
};

const questionById = new Map(Object.values(questionsByKind).flat().map((question) => [question.id, question]));

export function getQuestion(id: string): CatalogQuestion | null {
  return questionById.get(id) ?? null;
}

export function getPracticeItems(kind: PracticeKind): CatalogQuestion[] {
  return questionsByKind[kind];
}

export function validateCatalogReferences(): string[] {
  const errors: string[] = [];
  const listeningIds = new Set(listeningData.map((item) => item.id));
  const readingIds = new Set(readingData.map((item) => item.id));
  const translationIds = new Set(translationData.map((item) => item.id));
  const writingIds = new Set(writingData.map((item) => item.id));
  for (const mock of mockData) {
    for (const id of mock.listeningSetIds) if (!listeningIds.has(id)) errors.push(`${mock.id}: unknown listening set ${id}`);
    for (const id of mock.readingSetIds) if (!readingIds.has(id)) errors.push(`${mock.id}: unknown reading set ${id}`);
    if (!translationIds.has(mock.translationId)) errors.push(`${mock.id}: unknown translation ${mock.translationId}`);
    if (!writingIds.has(mock.writingId)) errors.push(`${mock.id}: unknown writing ${mock.writingId}`);
  }
  return errors;
}
