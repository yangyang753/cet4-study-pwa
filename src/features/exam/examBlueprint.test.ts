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
    }
  });

  it('rejects an unknown mock id', () => {
    expect(() => resolveExam('missing')).toThrow('Unknown mock exam: missing');
  });
});
