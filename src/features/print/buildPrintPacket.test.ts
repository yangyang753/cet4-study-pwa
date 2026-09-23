import { describe, expect, it } from 'vitest';
import { getPracticeItems } from '../../content/catalog';
import { buildPrintPacket } from './buildPrintPacket';

describe('buildPrintPacket', () => {
  it('numbers every calculated page and includes full answer explanations', () => {
    const questions = getPracticeItems('listening').slice(0, 10);
    const packet = buildPrintPacket({ kind: 'practice', questions, pageCapacity: 8 });
    const allPages = [...packet.questionPages, ...packet.answerPages];
    expect(allPages.every((page, index) => page.pageNumber === index + 1)).toBe(true);
    expect(allPages.every((page) => page.totalPages === allPages.length)).toBe(true);
    expect(packet.answerPages[0].blocks[0].explanation).toBe(questions[0].explanationZh);
  });

  it('adds writing space only for subjective questions', () => {
    const objective = buildPrintPacket({ kind: 'practice', questions: getPracticeItems('reading').slice(0, 4), pageCapacity: 8 });
    expect(objective.questionPages.flatMap((page) => page.blocks).some((block) => block.kind === 'writing-space')).toBe(false);

    const subjective = buildPrintPacket({ kind: 'practice', questions: getPracticeItems('writing').slice(0, 1), pageCapacity: 8 });
    expect(subjective.questionPages.flatMap((page) => page.blocks).filter((block) => block.kind === 'writing-space')).toHaveLength(1);
  });

  it('splits a long Chinese explanation into page-safe blocks', () => {
    const [base] = getPracticeItems('listening');
    const question = { ...base, explanationZh: '这是一段较长的中文解析。'.repeat(180) };
    const packet = buildPrintPacket({ kind: 'practice', questions: [question], pageCapacity: 4 });
    expect(packet.answerPages.length).toBeGreaterThan(1);
    expect(packet.answerPages.flatMap((page) => page.blocks).every((block) => block.weight <= 4)).toBe(true);
  });

  it('resolves a full mock packet with all 57 questions', () => {
    const packet = buildPrintPacket({ kind: 'mock', sourceId: 'mock-1', pageCapacity: 8 });
    expect(packet.questionCount).toBe(57);
    expect(packet.questionPages.flatMap((page) => page.blocks).filter((block) => block.kind === 'question')).toHaveLength(57);
  });
});
