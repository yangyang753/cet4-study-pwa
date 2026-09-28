import { contentCatalog, getPracticeItems } from '../../content/catalog';
import type { CatalogQuestion } from '../../domain/content';
import { formatOfficialReadingQuestions } from './examQuestionFormat';

export type ExamSectionKind = 'writing' | 'listening' | 'reading' | 'translation';

export interface ExamSection {
  kind: ExamSectionKind;
  minutes: number;
  questions: CatalogQuestion[];
}

export interface ResolvedExam {
  id: string;
  title: string;
  contentVersion: string;
  totalMinutes: 125;
  sections: ExamSection[];
}

function groupedSlice(questions: CatalogQuestion[], type: CatalogQuestion['type'], perGroup: number[], mockIndex: number) {
  const groupIds = [...new Set(questions.filter((question) => question.type === type).map((question) => question.groupId))];
  if (groupIds.length < perGroup.length) throw new Error(`Insufficient ${type} groups: expected ${perGroup.length}, received ${groupIds.length}`);
  const groupStart = (index: number) => {
    if (groupIds.length === 8 && perGroup.length === 3) return [0, 3, 6, 1, 4, 2][index] ?? (index * 3) % groupIds.length;
    if (groupIds.length === 8 && perGroup.length === 2) return [0, 2, 4, 6, 1, 3][index] ?? (index * 2) % groupIds.length;
    if (groupIds.length === 10 && perGroup.length === 2) return [0, 2, 4, 6, 8, 1][index] ?? (index * 2) % groupIds.length;
    return (index * perGroup.length) % groupIds.length;
  };
  const groupOffset = groupStart(mockIndex);
  return perGroup.flatMap((count, groupIndex) => {
    const groupId = groupIds[(groupOffset + groupIndex) % groupIds.length];
    const group = questions.filter((question) => question.type === type && question.groupId === groupId);
    if (group.length < count) throw new Error(`Insufficient ${type} questions in ${groupId}: expected ${count}, received ${group.length}`);
    let priorUse = 0;
    for (let priorMock = 0; priorMock < mockIndex; priorMock += 1) {
      const priorGroupOffset = groupStart(priorMock);
      perGroup.forEach((priorCount, priorGroupIndex) => {
        if (groupIds[(priorGroupOffset + priorGroupIndex) % groupIds.length] === groupId) priorUse += priorCount;
      });
    }
    const questionOffset = priorUse % group.length;
    return Array.from({ length: count }, (_, index) => group[(questionOffset + index) % group.length]);
  });
}

export function resolveExam(mockId: string): ResolvedExam {
  const mock = contentCatalog.mocks.find((candidate) => candidate.id === mockId);
  if (!mock) throw new Error(`Unknown mock exam: ${mockId}`);
  const mockIndex = contentCatalog.mocks.indexOf(mock);

  const writing = getPracticeItems('writing').filter((question) => question.id === mock.writingId);
  const listeningPool = getPracticeItems('listening');
  const listening = [
    ...groupedSlice(listeningPool, 'news', [3, 2, 2], mockIndex),
    ...groupedSlice(listeningPool, 'conversation', [4, 4], mockIndex),
    ...groupedSlice(listeningPool, 'passage', [4, 3, 3], mockIndex),
  ];
  const readingPool = getPracticeItems('reading');
  const reading = formatOfficialReadingQuestions([
    ...groupedSlice(readingPool, 'cloze', [10], mockIndex),
    ...groupedSlice(readingPool, 'matching', [10], mockIndex),
    ...groupedSlice(readingPool, 'reading', [5, 5], mockIndex),
  ]);
  const translation = getPracticeItems('translation').filter((question) => question.id === mock.translationId);
  const counts = [writing.length, listening.length, reading.length, translation.length];
  if (counts.join(',') !== '1,25,30,1') throw new Error(`${mock.id}: invalid section question counts ${counts.join('/')}`);

  return {
    id: mock.id,
    title: mock.title,
    contentVersion: 'v2',
    totalMinutes: 125,
    sections: [
      { kind: 'writing', minutes: 30, questions: writing },
      { kind: 'listening', minutes: 25, questions: listening },
      { kind: 'reading', minutes: 40, questions: reading },
      { kind: 'translation', minutes: 30, questions: translation },
    ],
  };
}
