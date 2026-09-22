import { describe, expect, it } from 'vitest';
import { auditContentPack } from './validateContent';

const validPack = {
  version: '1.0.0',
  knowledgePoints: [{ id: 'kp-1', title: '核心词汇', category: 'vocabulary' }],
  vocabulary: [{ id: 'word-1', word: 'encourage', phonetic: '/ɪnˈkʌrɪdʒ/', partOfSpeech: 'verb', meaningZh: '鼓励', example: 'Teachers encourage students.', derivatives: [], confusables: [] }],
  questions: [{
    id: 'q-1', version: 1, type: 'vocabulary', difficulty: 'foundation',
    prompt: 'Choose one.', knowledgePointIds: ['kp-1'], explanationZh: '词义题。',
    sourceNote: 'Original exercise modeled on the official CET-4 format',
    options: [{ id: 'A', text: 'one' }], correctAnswer: 'A',
  }],
  practiceSets: [{ id: 'set-1', title: '基础', questionIds: ['q-1'] }],
  audioAssets: [],
};

describe('auditContentPack', () => {
  it('reports duplicate IDs across the same collection', () => {
    const pack = { ...validPack, questions: [...validPack.questions, { ...validPack.questions[0] }] };
    expect(auditContentPack(pack)).toContain('Duplicate question id: q-1');
  });

  it('returns no errors for a valid pack', () => {
    expect(auditContentPack(validPack)).toEqual([]);
  });
});
