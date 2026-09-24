import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { SubjectiveQuestion } from '../../domain/content';
import { evaluateSubjectiveMastery, SubjectiveMasteryCheck } from './SubjectiveMasteryCheck';

const writingQuestion: SubjectiveQuestion = {
  id: 'write-test', version: 1, type: 'writing', difficulty: 'foundation',
  prompt: 'Write about an effective study habit.', knowledgePointIds: ['writing:structure'],
  explanationZh: '观点、理由和结论应当完整。', sourceNote: '原创仿真练习',
  rubric: ['观点明确', '理由充分'], referenceAnswer: 'Daily review is useful because it makes progress visible and helps learners correct mistakes.',
};

const translationQuestion: SubjectiveQuestion = {
  ...writingQuestion, id: 'translation-test', type: 'translation', prompt: '越来越多的大学生参加志愿服务。',
  referenceAnswer: 'More and more college students take part in volunteer service because they want to help others.',
};

function repository() {
  return {
    saveAttemptOnce: vi.fn().mockResolvedValue(undefined),
    upsertReviewCard: vi.fn().mockResolvedValue(undefined),
    upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
    completeTask: vi.fn().mockResolvedValue(undefined),
  } as unknown as LearningRepository;
}

describe('SubjectiveMasteryCheck', () => {
  it('checks a writing micro-paragraph for length, structure, connection and punctuation', () => {
    const strong = 'I believe daily review is useful because it helps learners notice mistakes. Therefore, students can correct weak points early and become more confident before important examinations during every busy semester.';
    expect(evaluateSubjectiveMastery('writing', strong, writingQuestion).filter((check) => check.passed)).toHaveLength(4);
    expect(evaluateSubjectiveMastery('writing', 'Daily review helps.', writingQuestion).filter((check) => check.passed).length).toBeLessThan(4);
  });

  it('checks translation evidence against core reference words instead of grammar questions', () => {
    const strong = 'More and more college students take part in volunteer service because they sincerely want to help other people.';
    expect(evaluateSubjectiveMastery('translation', strong, translationQuestion).filter((check) => check.passed)).toHaveLength(4);
  });

  it('records a mastered writing outcome only after aligned written evidence passes', async () => {
    const user = userEvent.setup();
    const learningRepository = repository();
    render(<SubjectiveMasteryCheck kind="writing" taskId="2026-09-24:writing" question={writingQuestion} repository={learningRepository} now="2026-09-24T12:00:00.000Z" />);

    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: '写作掌握证明' }), 'I believe daily review is useful because it helps learners notice mistakes. Therefore, students can correct weak points early and become more confident before important examinations during every busy semester.');
    await user.click(screen.getByRole('button', { name: '检查是否掌握' }));

    expect(await screen.findByText('已完全掌握')).toBeVisible();
    expect(learningRepository.saveAttemptOnce).toHaveBeenCalledWith(expect.objectContaining({ questionId: 'write-test', kind: 'writing', mode: 'mastery', correct: true }));
    expect(learningRepository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ status: 'mastered' }));
  });
});
