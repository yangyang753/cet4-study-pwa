import { describe, expect, it } from 'vitest';
import { getPracticeItems } from '../../content/catalog';
import { buildPrintPacket } from './buildPrintPacket';
import type { VocabularyEntry } from '../../domain/content';

describe('buildPrintPacket', () => {
  it('builds the daily packet from assigned words and the daily culture translation', () => {
    const words: VocabularyEntry[] = [{ id: 'v1', word: 'culture', phonetic: '', partOfSpeech: 'n.', meaningZh: '文化', example: 'Culture connects people.', derivatives: [], confusables: [] }];
    const culturePrompt = { id: 'culture-day', theme: '文化传承', promptZh: '中国文化代代相传。', referenceAnswer: 'Chinese culture is passed down through generations.', targetWordIds: ['v1'], keyPoints: ['文化', '传承'] };
    const packet = buildPrintPacket({ kind: 'daily', dailyVocabulary: words, dailyCulturePrompt: culturePrompt, pageCapacity: 8 });
    const questions = packet.questionPages.flatMap((page) => page.blocks);
    const answers = packet.answerPages.flatMap((page) => page.blocks);
    expect(questions.some((block) => block.questionId === 'daily-word:v1' && block.text.includes('c_l_u_e'))).toBe(true);
    expect(questions.some((block) => block.questionId === 'culture-day' && block.text.includes('中国文化代代相传'))).toBe(true);
    expect(answers.some((block) => block.questionId.startsWith('daily-word:v1') && block.answer === 'culture')).toBe(true);
    expect(answers.some((block) => block.questionId.startsWith('culture-day') && block.answer === culturePrompt.referenceAnswer)).toBe(true);
  });

  it('numbers every calculated page and includes full answer explanations', () => {
    const questions = getPracticeItems('listening').slice(0, 10);
    const packet = buildPrintPacket({ kind: 'practice', questions, pageCapacity: 8 });
    const allPages = [...packet.questionPages, ...packet.answerPages];
    expect(packet.pages).toEqual(allPages);
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

  it('prints shared reading context once before grouped questions', () => {
    const questions = getPracticeItems('reading').filter((question) => question.passage).slice(0, 2);
    const packet = buildPrintPacket({ kind: 'practice', questions, pageCapacity: 20 });
    const contexts = packet.questionPages.flatMap((page) => page.blocks).filter((block) => block.kind === 'context');
    expect(contexts).toHaveLength(1);
    expect(contexts[0].text).toContain(questions[0].passage!);
  });

  it('prints an audio entry once for a listening group', () => {
    const questions = getPracticeItems('listening').slice(0, 2);
    const packet = buildPrintPacket({ kind: 'practice', questions, pageCapacity: 20 });
    const contexts = packet.questionPages.flatMap((page) => page.blocks).filter((block) => block.kind === 'context');
    expect(contexts).toHaveLength(1);
    expect(contexts[0].text).toContain(questions[0].audioSrc!);
    expect(contexts[0].href).toBe(questions[0].audioSrc);
  });
});
