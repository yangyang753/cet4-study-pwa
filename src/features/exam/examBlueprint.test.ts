import { describe, expect, it } from 'vitest';
import { contentCatalog } from '../../content/catalog';
import { resolveExam } from './examBlueprint';

describe('resolveExam', () => {
  it('resolves every mock into the official 125-minute, 57-question order', () => {
    for (const mock of contentCatalog.mocks) {
      const exam = resolveExam(mock.id);
      expect(exam.totalMinutes).toBe(125);
      expect(exam.sections.map((section) => section.kind)).toEqual(['writing', 'listening', 'reading', 'translation']);
      expect(exam.sections.map((section) => section.minutes)).toEqual([30, 25, 40, 30]);
      expect(exam.sections.map((section) => section.questions.length)).toEqual([1, 25, 30, 1]);
      expect(exam.sections.flatMap((section) => section.questions)).toHaveLength(57);
      const listening = exam.sections.find((section) => section.kind === 'listening')!.questions;
      const reading = exam.sections.find((section) => section.kind === 'reading')!.questions;
      expect({
        news: listening.filter((question) => question.type === 'news').length,
        conversation: listening.filter((question) => question.type === 'conversation').length,
        passage: listening.filter((question) => question.type === 'passage').length,
      }).toEqual({ news: 7, conversation: 8, passage: 10 });
      expect({
        cloze: reading.filter((question) => question.type === 'cloze').length,
        matching: reading.filter((question) => question.type === 'matching').length,
        reading: reading.filter((question) => question.type === 'reading').length,
      }).toEqual({ cloze: 10, matching: 10, reading: 10 });
      expect(new Set(listening.filter((question) => question.type === 'news').map((question) => question.groupId))).toHaveLength(3);
      expect(new Set(listening.filter((question) => question.type === 'conversation').map((question) => question.groupId))).toHaveLength(2);
      expect(new Set(listening.filter((question) => question.type === 'passage').map((question) => question.groupId))).toHaveLength(3);
      expect(new Set(reading.filter((question) => question.type === 'cloze').map((question) => question.groupId))).toHaveLength(1);
      expect(new Set(reading.filter((question) => question.type === 'matching').map((question) => question.groupId))).toHaveLength(10);
      const carefulGroups = [...new Set(reading.filter((question) => question.type === 'reading').map((question) => question.groupId))];
      expect(carefulGroups).toHaveLength(2);
      expect(carefulGroups.map((groupId) => reading.filter((question) => question.groupId === groupId).length)).toEqual([5, 5]);
      expect(new Set(exam.sections.flatMap((section) => section.questions.map((question) => question.id))).size).toBe(57);
    }
  });

  it('rejects an unknown mock id', () => {
    expect(() => resolveExam('missing')).toThrow('Unknown mock exam: missing');
  });

  it('does not reuse question ids across the six shipped mock exams', () => {
    const seen = new Set<string>();
    for (const mock of contentCatalog.mocks) {
      const ids = resolveExam(mock.id).sections.flatMap((section) => section.questions.map((question) => question.id));
      expect(ids.filter((id) => seen.has(id))).toEqual([]);
      ids.forEach((id) => seen.add(id));
    }
  });
});
