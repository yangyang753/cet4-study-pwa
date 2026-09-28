import { describe, expect, it } from 'vitest';
import { resolveExam } from './examBlueprint';
import { isFormattedObjective } from './examQuestionFormat';

describe('official reading question formats', () => {
  it('builds one 15-item bank for ten cloze blanks', () => {
    const reading = resolveExam('mock-1').sections.find((section) => section.kind === 'reading')!.questions;
    const cloze = reading.filter((question) => question.type === 'cloze').filter(isFormattedObjective);
    expect(cloze).toHaveLength(10);
    expect(cloze.every((question) => question.examFormat === 'cloze-bank')).toBe(true);
    expect(cloze.every((question) => question.options.length === 15)).toBe(true);
    expect(new Set(cloze[0].options.map((option) => option.text)).size).toBe(15);
    expect(cloze[0].examContext).toContain('[1]');
    expect(cloze[0].examContext).toContain('[10]');
    expect(cloze[0].examContext?.match(/\[\d+\]/g)).toHaveLength(10);
    expect(cloze.every((question) => question.groupId === cloze[0].groupId)).toBe(true);
  });

  it('builds A-J paragraph matching with one statement per paragraph', () => {
    const reading = resolveExam('mock-2').sections.find((section) => section.kind === 'reading')!.questions;
    const matching = reading.filter((question) => question.type === 'matching').filter(isFormattedObjective);
    expect(matching).toHaveLength(10);
    expect(matching.every((question) => question.examFormat === 'paragraph-matching')).toBe(true);
    expect(matching.every((question) => question.options.map((option) => option.id).join('') === 'ABCDEFGHIJ')).toBe(true);
    expect(new Set(matching.map((question) => question.correctAnswer))).toEqual(new Set('ABCDEFGHIJ'));
    expect(matching[0].examContext).toContain('[A]');
    expect(matching[0].examContext).toContain('[J]');
  });
});
