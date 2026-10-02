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
        else if (question.type === 'writing') active.answers[question.id] = `First, daily reading matters because it builds confidence and helps university students understand the world. A practical suggestion for encouraging this habit is a campus reading circle. Learners can read short reports, discuss one useful idea, and record new expressions in a notebook. They should also compare different opinions and revise their summaries before unclear ideas become habits. These activities make each reading session purposeful and manageable.\n\nMoreover, steady effort is more valuable than occasional long sessions. Students can set a realistic goal, review difficult vocabulary, discuss one book with classmates, and write a brief summary afterward. For example, a weekly activity can invite each member to explain one passage. When progress is measured every week, weaknesses become easier to notice and correct. Therefore, this workable plan gradually improves accuracy, memory, and confidence while making daily reading part of college life.`;
        else active.answers[question.id] = 'On weekends, university learners often join volunteer programs and give useful support to local residents. This experience develops communication abilities and helps young adults understand social responsibility. The practice reflects the Chinese tradition of helping one another and sharing duties. Universities therefore include community projects in labor education and social learning. Such programs attract younger generations, and schools invite them to participate. Modern communication makes tradition more lively and gives the public additional opportunities to learn.';
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
    expect(score.sections).toEqual({ writing: 106.5, listening: 248.5, reading: 248.5, translation: 106.5 });
    expect(score.total).toBe(710);
    expect(score.gapTo425).toBe(-285);
  });
});
