import type { ExamSessionRecord } from '../../domain/exam';
import { evaluateSubjective } from '../composition/evaluateSubjective';
import type { ExamSectionKind, ResolvedExam } from './examBlueprint';

const sectionWeights: Record<ExamSectionKind, number> = {
  writing: 106.5,
  listening: 248.5,
  reading: 248.5,
  translation: 106.5,
};

function answerMatches(response: string | string[], answer: string | string[]) {
  const received = Array.isArray(response) ? [...response].sort() : [response];
  const expected = Array.isArray(answer) ? [...answer].sort() : [answer];
  return received.length === expected.length && received.every((value, index) => value === expected[index]);
}

function subjectiveRatio(session: ExamSessionRecord, section: ResolvedExam['sections'][number]) {
  if (!section.questions.length) return 0;
  const total = section.questions.reduce((sum, question) => {
    if ('correctAnswer' in question) return sum;
    const response = session.answers[question.id];
    const body = typeof response === 'string' ? response : '';
    const keywords = question.type === 'translation'
      ? [...new Set(question.referenceAnswer.toLowerCase().match(/[a-z]{5,}/g) ?? [])].slice(0, 4)
      : [];
    return sum + evaluateSubjective(question.type, body, keywords).score;
  }, 0);
  return total / section.questions.length;
}

export function estimateCetScore(session: ExamSessionRecord, exam: ResolvedExam) {
  const sections = Object.fromEntries(exam.sections.map((section) => {
    const ratio = section.kind === 'listening' || section.kind === 'reading'
      ? section.questions.filter((question) => {
        if (!('correctAnswer' in question)) return false;
        const response = session.answers[question.id];
        return response !== undefined && answerMatches(response, question.correctAnswer);
      }).length / section.questions.length
      : subjectiveRatio(session, section);
    return [section.kind, Math.round(ratio * sectionWeights[section.kind] * 10) / 10];
  })) as Record<ExamSectionKind, number>;
  const total = Math.round(Object.values(sections).reduce((sum, score) => sum + score, 0));
  return { total, sections, gapTo425: 425 - total };
}
