import { describe, expect, it } from 'vitest';
import { resolveExam } from './examBlueprint';
import { createExamSession, reduceExamSession } from './examSessionReducer';
import { estimateCetScore } from './estimateCetScore';

function submittedSession(perfect: boolean) {
  const exam = resolveExam('mock-1');
  const active = createExamSession(exam, '2026-09-24T00:00:00.000Z');
  if (perfect) {
    for (const section of exam.sections) {
      for (const question of section.questions) {
        if ('correctAnswer' in question) active.answers[question.id] = question.correctAnswer;
        else if (question.type === 'writing') active.answers[question.id] = `First, regular English practice builds confidence and helps students communicate clearly in daily life. A practical plan can include listening to short reports, reading campus news, and recording useful expressions in a notebook. Learners should also speak aloud, compare their pronunciation with reliable audio, and revise mistakes before they become habits. These activities make each study session purposeful and manageable.\n\nMoreover, steady effort is more valuable than occasional long sessions. Students can set a realistic goal, review difficult vocabulary, discuss one topic with classmates, and write a brief summary afterward. When progress is measured every week, weaknesses become easier to notice and correct. Therefore, a balanced routine gradually improves accuracy, fluency, memory, and confidence while preparing learners for future academic tasks.`;
        else {
          const keywords = [...new Set(question.referenceAnswer.toLowerCase().match(/[a-z]{5,}/g) ?? [])].slice(0, 4);
          active.answers[question.id] = `${keywords.join(' ')} is important and can support lasting progress.`;
        }
      }
    }
  }
  return { exam, session: reduceExamSession(active, { type: 'submit', now: '2026-09-24T02:00:00.000Z' }) };
}

describe('estimateCetScore', () => {
  it('returns zero for a blank exam', () => {
    const { exam, session } = submittedSession(false);
    expect(estimateCetScore(session, exam)).toEqual({
      total: 0,
      sections: { writing: 0, listening: 0, reading: 0, translation: 0 },
      gapTo425: 425,
    });
  });

  it('returns 710 for fully correct objective answers and strong subjective answers', () => {
    const { exam, session } = submittedSession(true);
    const score = estimateCetScore(session, exam);
    expect(score.total).toBe(710);
    expect(score.sections).toEqual({ writing: 106.5, listening: 248.5, reading: 248.5, translation: 106.5 });
    expect(score.gapTo425).toBe(-285);
  });
});
