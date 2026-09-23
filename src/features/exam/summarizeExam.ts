import type { CatalogQuestion } from '../../domain/content';
import type { ExamSessionRecord } from '../../domain/exam';
import type { ExamSectionKind, ResolvedExam } from './examBlueprint';

export interface ExamSectionSummary { answered: number; total: number; completion: number; objectiveCorrect: number; objectiveAnswered: number; accuracy: number | null }
export interface ExamSummary { elapsedSeconds: number; answered: number; total: number; completion: number; sections: Record<ExamSectionKind, ExamSectionSummary>; weakKnowledgePoints: string[]; wrongQuestions: CatalogQuestion[]; unansweredQuestionIds: string[] }

function answerMatches(response: string | string[], correctAnswer: string | string[]) {
  const left = Array.isArray(response) ? response : [response];
  const right = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
  const sortedRight = [...right].sort();
  return left.length === right.length && [...left].sort().every((value, index) => value === sortedRight[index]);
}

export function summarizeExam(session: ExamSessionRecord, exam: ResolvedExam): ExamSummary {
  const weakCounts = new Map<string, number>();
  const wrongQuestions: CatalogQuestion[] = [];
  const unansweredQuestionIds: string[] = [];
  const sectionEntries = exam.sections.map((section) => {
    let answered = 0;
    let objectiveAnswered = 0;
    let objectiveCorrect = 0;
    for (const question of section.questions) {
      const response = session.answers[question.id];
      if (response === undefined || response === '' || (Array.isArray(response) && response.length === 0)) { unansweredQuestionIds.push(question.id); continue; }
      answered += 1;
      if ('correctAnswer' in question) {
        objectiveAnswered += 1;
        if (answerMatches(response, question.correctAnswer)) objectiveCorrect += 1;
        else { wrongQuestions.push(question); question.knowledgePointIds.forEach((point) => weakCounts.set(point, (weakCounts.get(point) ?? 0) + 1)); }
      }
    }
    const value: ExamSectionSummary = { answered, total: section.questions.length, completion: answered / section.questions.length, objectiveCorrect, objectiveAnswered, accuracy: objectiveAnswered ? objectiveCorrect / objectiveAnswered : null };
    return [section.kind, value] as const;
  });
  const total = exam.sections.reduce((sum, section) => sum + section.questions.length, 0);
  const answered = total - unansweredQuestionIds.length;
  const endedAt = session.submittedAt ?? session.updatedAt;
  const elapsedSeconds = Math.min(exam.totalMinutes * 60, Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(session.startedAt)) / 1000)));
  return { elapsedSeconds, answered, total, completion: answered / total, sections: Object.fromEntries(sectionEntries) as Record<ExamSectionKind, ExamSectionSummary>, weakKnowledgePoints: [...weakCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).map(([point]) => point), wrongQuestions, unansweredQuestionIds };
}
