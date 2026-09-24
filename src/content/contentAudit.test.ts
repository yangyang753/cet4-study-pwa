import { describe, expect, it } from 'vitest';
import { auditContentDiversity, auditContentInventory, auditGeneratedQuestions, auditKnowledgeExamples } from './contentAudit';
import { getPracticeItems } from './catalog';
import inventory from '../../content/v1/inventory.json';

describe('auditContentInventory', () => {
  it('reports every category below the approved minimum', () => {
    const errors = auditContentInventory({ vocabulary: [], collocations: [], grammarTopics: [], listeningSets: [], readingSets: [], translations: [], writingPrompts: [], mockExams: [] });
    expect(errors).toContain('vocabulary: expected at least 800, received 0');
    expect(errors).toContain('listeningSets: expected at least 24, received 0');
    expect(errors).toContain('mockExams: expected at least 6, received 0');
  });

  it('accepts an inventory meeting every minimum', () => {
    const make = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `id-${index}` }));
    expect(auditContentInventory({ vocabulary: make(800), collocations: make(120), grammarTopics: make(15), listeningSets: make(24), readingSets: make(30), translations: make(12), writingPrompts: make(12), mockExams: make(6) })).toEqual([]);
  });

  it('accepts only shipped mocks with the complete 57-question structure', () => {
    expect(auditContentInventory(inventory)).toEqual([]);
  });

  it('accepts generated questions with unique options and balanced answer positions', () => {
    expect(auditGeneratedQuestions({ vocabulary: getPracticeItems('vocabulary'), grammar: getPracticeItems('grammar') })).toEqual([]);
  });
});

describe('auditContentDiversity', () => {
  const question = (prompt: string, answer: number) => ({ prompt, answer, options: ['a', 'b', 'c', 'd'] });

  it('rejects cosmetically renamed listening and reading templates', () => {
    const errors = auditContentDiversity({
      listeningSets: [
        { id: 'l1', theme: 'libraries', themeEn: 'libraries', transcript: 'A campus project about libraries helps students every week.', audioSrc: '/audio/l1.wav', questions: [question('When does it happen?', 0)] },
        { id: 'l2', theme: 'sports', themeEn: 'sports', transcript: 'A campus project about sports helps students every week.', audioSrc: '/audio/l2.wav', questions: [question('Why does it happen?', 1)] },
      ],
      readingSets: [
        { id: 'r1', theme: 'libraries', passage: 'Libraries have become important. Students joined a project.', questions: [question('What is the main idea?', 0)] },
        { id: 'r2', theme: 'sports', passage: 'Sports have become important. Students joined a project.', questions: [question('What helped students?', 1)] },
      ],
      translations: [], writingPrompts: [],
    });
    expect(errors).toContain('listeningSets: repeated normalized transcript');
    expect(errors).toContain('readingSets: repeated normalized passage');
  });

  it('rejects low prompt diversity, missing audio references, and biased answers', () => {
    const repeated = Array.from({ length: 12 }, () => question('What happened?', 1));
    const errors = auditContentDiversity({
      listeningSets: [{ id: 'l1', theme: 'one', transcript: 'Unique listening material.', audioSrc: '', questions: repeated }],
      readingSets: [{ id: 'r1', theme: 'two', passage: 'Unique reading material.', questions: repeated }],
      translations: [], writingPrompts: [],
    });
    expect(errors).toContain('listeningSets: prompt diversity below 50%');
    expect(errors).toContain('listeningSets:l1: missing audio reference');
    expect(errors).toContain('readingSets: answer position 1 exceeds 60%');
  });

  it('accepts the shipped content diversity contract', () => {
    expect(auditContentDiversity(inventory)).toEqual([]);
  });
});

describe('auditKnowledgeExamples', () => {
  it('rejects the former vocabulary and collocation placeholder templates', () => {
    expect(auditKnowledgeExamples(
      [{ id: 'v1', example: 'The word “benefit” often appears in college English reading and listening.', exampleZh: '' }],
      [{ id: 'c1', example: 'Use “take part in” to express this idea clearly in CET-4 writing or translation.', exampleZh: '' }],
    )).toEqual(expect.arrayContaining([
      'vocabulary:v1: generic placeholder example',
      'vocabulary:v1: missing Chinese memory cue',
      'collocations:c1: generic placeholder example',
      'collocations:c1: missing Chinese memory cue',
    ]));
  });

  it('accepts contextual examples with Chinese memory cues', () => {
    expect(auditKnowledgeExamples(
      [{ id: 'v1', example: 'Regular exercise can benefit both physical and mental health.', exampleZh: '规律运动有益于身心健康。' }],
      [{ id: 'c1', example: 'Many students take part in community service on weekends.', exampleZh: '许多学生周末参加社区服务。' }],
    )).toEqual([]);
  });
});
