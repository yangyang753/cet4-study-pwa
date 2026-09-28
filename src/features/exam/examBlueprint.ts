import { contentCatalog, getPracticeItems } from '../../content/catalog';
import type { CatalogQuestion } from '../../domain/content';

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

function subtypeSlice(questions: CatalogQuestion[], type: CatalogQuestion['type'], count: number, mockIndex: number) {
  const pool = questions.filter((question) => question.type === type);
  if (pool.length < count) throw new Error(`Insufficient ${type} questions: expected ${count}, received ${pool.length}`);
  const offset = (mockIndex * count) % pool.length;
  return Array.from({ length: count }, (_, index) => pool[(offset + index) % pool.length]);
}

export function resolveExam(mockId: string): ResolvedExam {
  const mock = contentCatalog.mocks.find((candidate) => candidate.id === mockId);
  if (!mock) throw new Error(`Unknown mock exam: ${mockId}`);
  const mockIndex = contentCatalog.mocks.indexOf(mock);

  const writing = getPracticeItems('writing').filter((question) => question.id === mock.writingId);
  const listeningPool = getPracticeItems('listening');
  const listening = [
    ...subtypeSlice(listeningPool, 'news', 7, mockIndex),
    ...subtypeSlice(listeningPool, 'conversation', 8, mockIndex),
    ...subtypeSlice(listeningPool, 'passage', 10, mockIndex),
  ];
  const readingPool = getPracticeItems('reading');
  const reading = [
    ...subtypeSlice(readingPool, 'cloze', 10, mockIndex),
    ...subtypeSlice(readingPool, 'matching', 10, mockIndex),
    ...subtypeSlice(readingPool, 'reading', 10, mockIndex),
  ];
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
