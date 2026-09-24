import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { recordMasteryOutcome } from './taskProgress';

function repository() {
  return {
    completeTask: vi.fn().mockResolvedValue(undefined),
    upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
  } as unknown as LearningRepository;
}

describe('recordMasteryOutcome', () => {
  it('marks four of five correct answers as mastered with stable ids', async () => {
    const learningRepository = repository();
    expect(await recordMasteryOutcome(learningRepository, '2026-09-24:listening', 4, 5, '2026-09-24T09:00:00.000Z')).toBe('mastered');
    expect(learningRepository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ id: 'mastery:2026-09-24:listening', status: 'mastered' }));
    expect(learningRepository.completeTask).toHaveBeenCalledWith(expect.objectContaining({ id: '2026-09-24:listening', taskId: '2026-09-24:listening' }));
  });

  it('schedules remediation below eighty percent', async () => {
    const learningRepository = repository();
    expect(await recordMasteryOutcome(learningRepository, '2026-09-24:reading', 3, 5, '2026-09-24T09:00:00.000Z')).toBe('remediation');
    expect(learningRepository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ status: 'review' }));
  });

  it('does not persist an unsupported kind from a malformed task id', async () => {
    const learningRepository = repository();
    await recordMasteryOutcome(learningRepository, 'malformed:unsafe-kind', 3, 3, '2026-09-24T09:00:00.000Z');
    expect(learningRepository.completeTask).toHaveBeenCalledWith(expect.objectContaining({ kind: 'review' }));
  });
});
