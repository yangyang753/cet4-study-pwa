import { describe, expect, it } from 'vitest';
import listeningSets from '../../content/v1/listeningSets.json';
import readingSets from '../../content/v1/readingSets.json';
import writingPrompts from '../../content/v1/writingPrompts.json';
import { auditQuestionTemplateDiversity } from './questionDiversity';

describe('auditQuestionTemplateDiversity', () => {
  it('rejects repeated templates, missing skills, and reused filler options', () => {
    const sets = Array.from({ length: 20 }, (_, index) => ({
      id: `set-${index}`, theme: `topic-${index}`, themeEn: `topic-${index}`,
      questions: [{ prompt: `What happened in topic-${index}?`, skillTag: 'detail', answer: 0, options: ['Correct detail', 'It has been cancelled.', 'No advance action is needed.', 'A building closed permanently.'] }],
    }));
    const errors = auditQuestionTemplateDiversity(sets, 'listening');
    expect(errors.some((error) => error.includes('normalized unique template ratio'))).toBe(true);
    expect(errors.some((error) => error.includes('missing skill tags'))).toBe(true);
    expect(errors.some((error) => error.includes('fixed irrelevant option'))).toBe(true);
  });

  it('accepts the shipped listening and reading banks', () => {
    expect(auditQuestionTemplateDiversity(listeningSets, 'listening')).toEqual([]);
    expect(auditQuestionTemplateDiversity(readingSets, 'reading')).toEqual([]);
  });

  it('keeps Chinese topic labels out of English reading passages', () => {
    expect(readingSets.filter((set) => /[\u3400-\u9fff]/u.test(set.passage))).toEqual([]);
  });

  it('uses varied, grammatical writing guidance instead of one repeated template', () => {
    expect(new Set(writingPrompts.map((item) => item.referenceOpening)).size).toBe(writingPrompts.length);
    expect(new Set(writingPrompts.map((item) => item.outline.join('|'))).size).toBeGreaterThanOrEqual(6);
    expect(writingPrompts.filter((item) => /\b(?:habits|activities|tools) deserves\b/i.test(item.referenceOpening))).toEqual([]);
  });
});
