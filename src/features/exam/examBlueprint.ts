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

const byGroup = (questions: CatalogQuestion[], ids: string[]) => ids.flatMap((id) => questions.filter((question) => question.groupId === id));

export function resolveExam(mockId: string): ResolvedExam {
  const mock = contentCatalog.mocks.find((candidate) => candidate.id === mockId);
  if (!mock) throw new Error(`Unknown mock exam: ${mockId}`);

  const writing = getPracticeItems('writing').filter((question) => question.id === mock.writingId);
  const listening = byGroup(getPracticeItems('listening'), mock.listeningSetIds);
  const reading = byGroup(getPracticeItems('reading'), mock.readingSetIds);
  const translation = getPracticeItems('translation').filter((question) => question.id === mock.translationId);
  const counts = [writing.length, listening.length, reading.length, translation.length];
  if (counts.join(',') !== '1,25,30,1') throw new Error(`${mock.id}: invalid section question counts ${counts.join('/')}`);

  return {
    id: mock.id,
    title: mock.title,
    contentVersion: 'v1',
    totalMinutes: 125,
    sections: [
      { kind: 'writing', minutes: 30, questions: writing },
      { kind: 'listening', minutes: 25, questions: listening },
      { kind: 'reading', minutes: 40, questions: reading },
      { kind: 'translation', minutes: 30, questions: translation },
    ],
  };
}
