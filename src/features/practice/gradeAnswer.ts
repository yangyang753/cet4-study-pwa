import type { ObjectiveQuestion } from '../../domain/content';

export interface GradeResult { correct: boolean; score: number; normalizedResponse: string | string[]; feedbackKey: 'correct' | 'incorrect' | 'unanswered' }

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export function gradeAnswer(question: ObjectiveQuestion, response: unknown): GradeResult {
  const expected = Array.isArray(question.correctAnswer) ? question.correctAnswer.map(normalize) : normalize(question.correctAnswer);
  const normalizedResponse = Array.isArray(response) ? response.map(normalize) : normalize(response);
  const unanswered = Array.isArray(normalizedResponse) ? normalizedResponse.length === 0 || normalizedResponse.some((item) => !item) : !normalizedResponse;
  const correct = !unanswered && (Array.isArray(expected)
    ? Array.isArray(normalizedResponse) && expected.length === normalizedResponse.length && expected.every((item, index) => item === normalizedResponse[index])
    : normalizedResponse === expected);
  return { correct, score: correct ? 1 : 0, normalizedResponse, feedbackKey: unanswered ? 'unanswered' : correct ? 'correct' : 'incorrect' };
}
