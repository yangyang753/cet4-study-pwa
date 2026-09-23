import { describe, expect, it } from 'vitest';
import { resolveExam } from './examBlueprint';
import { createExamSession, reduceExamSession } from './examSessionReducer';
import { summarizeExam } from './summarizeExam';

describe('summarizeExam', () => {
  it('reports completion, objective accuracy, time, and weak points without an official score', () => {
    const exam = resolveExam('mock-1');
    const [correct, wrong] = exam.sections[1].questions;
    if (!('correctAnswer' in correct)) throw new Error('Expected an objective listening question');
    let session = createExamSession(exam, '2026-09-23T00:00:00.000Z');
    session = reduceExamSession(session, { type: 'answer', questionId: correct.id, response: Array.isArray(correct.correctAnswer) ? correct.correctAnswer[0] : correct.correctAnswer, now: '2026-09-23T00:01:00.000Z' });
    session = reduceExamSession(session, { type: 'answer', questionId: wrong.id, response: 'D', now: '2026-09-23T00:02:00.000Z' });
    session = reduceExamSession(session, { type: 'submit', now: '2026-09-23T00:10:00.000Z' });

    const summary = summarizeExam(session, exam);

    expect(summary.sections.listening.accuracy).toBe(0.5);
    expect(summary.sections.listening.answered).toBe(2);
    expect(summary.elapsedSeconds).toBe(600);
    expect(summary.weakKnowledgePoints[0]).toBe('因果关系');
    expect(summary).not.toHaveProperty('officialScore');
  });
});
