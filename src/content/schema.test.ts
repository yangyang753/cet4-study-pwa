import { describe, expect, it } from 'vitest';
import { parseContentPack } from './schema';

const baseQuestion = {
  id: 'q-1',
  version: 1,
  type: 'vocabulary',
  difficulty: 'foundation',
  prompt: 'Choose the best word.',
  knowledgePointIds: ['kp-1'],
  explanationZh: '考查基础词义。',
  sourceNote: 'Original exercise modeled on the official CET-4 format',
};

function packWith(question: Record<string, unknown>) {
  return {
    version: '1.0.0',
    knowledgePoints: [{ id: 'kp-1', title: '核心词汇', category: 'vocabulary' }],
    vocabulary: [{ id: 'word-1', word: 'encourage', phonetic: '/ɪnˈkʌrɪdʒ/', partOfSpeech: 'verb', meaningZh: '鼓励', example: 'Teachers encourage students to ask questions.', derivatives: [], confusables: [] }],
    questions: [question],
    practiceSets: [{ id: 'set-1', title: '基础练习', questionIds: ['q-1'] }],
    audioAssets: [],
  };
}

describe('parseContentPack', () => {
  it('rejects an objective answer that is not one of its options', () => {
    const input = packWith({
      ...baseQuestion,
      options: [
        { id: 'A', text: 'encourage' },
        { id: 'B', text: 'avoid' },
      ],
      correctAnswer: 'C',
    });

    expect(() => parseContentPack(input)).toThrow(/correctAnswer/);
  });

  it('requires ordered transcript segments for listening questions', () => {
    const input = packWith({
      ...baseQuestion,
      type: 'conversation',
      audioAssetId: 'audio-1',
      options: [
        { id: 'A', text: 'Saturday' },
        { id: 'B', text: 'Sunday' },
      ],
      correctAnswer: 'B',
    });
    input.audioAssets = [{ id: 'audio-1', src: '/audio/one.mp3', durationSeconds: 20, transcript: 'Hello.' }] as never[];

    expect(() => parseContentPack(input)).toThrow(/segments/);
  });

  it('rejects references to unknown knowledge points', () => {
    const input = packWith({
      ...baseQuestion,
      knowledgePointIds: ['missing'],
      options: [{ id: 'A', text: 'encourage' }],
      correctAnswer: 'A',
    });

    expect(() => parseContentPack(input)).toThrow(/knowledge point/i);
  });

  it('requires every vocabulary entry to include a part of speech', () => {
    const input = packWith({
      ...baseQuestion,
      options: [{ id: 'A', text: 'encourage' }],
      correctAnswer: 'A',
    });
    delete (input.vocabulary[0] as Record<string, unknown>).partOfSpeech;
    expect(() => parseContentPack(input)).toThrow(/partOfSpeech/);
  });
});
