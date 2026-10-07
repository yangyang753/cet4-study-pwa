import { describe, expect, it } from 'vitest';
import inventory from '../../content/v1/inventory.json';
import { foundationVocabulary } from './foundationVocabulary';
import { learningVocabulary } from './vocabularyLearning';
import { auditPracticeVocabularyCoverage } from './vocabularyCoverage';

describe('auditPracticeVocabularyCoverage', () => {
  const entry = (word: string, derivatives: string[] = []) => ({
    id: `test-${word}`,
    word,
    phonetic: '/test/',
    partOfSpeech: 'n.',
    meaningZh: '测试',
    example: `${word} appears here.`,
    exampleZh: '测试。',
    derivatives,
    confusables: [],
  });

  it('reports a repeated practice word that is absent from every study layer', () => {
    expect(auditPracticeVocabularyCoverage(
      { readingSets: [{ passage: 'Evidence supports the conclusion. The conclusion is clear.' }] },
      [entry('evidence'), entry('the')],
      { minimumOccurrences: 2 },
    )).toEqual(['practice vocabulary: conclusion appears 2 times but is missing from study catalogs']);
  });

  it('recognizes common inflections and declared irregular forms', () => {
    expect(auditPracticeVocabularyCoverage(
      { readingSets: [{ passage: "Students and researchers followed the organizers' instructions. Other researchers thanked the organizers. The report's follow-up confirmed that one student had followed every instruction." }] },
      [entry('the'), entry('student'), entry('research'), entry('organize'), entry('follow', ['followed']), entry('instruction'), entry('report'), entry('up')],
      { minimumOccurrences: 2 },
    )).toEqual([]);
  });

  it('counts learner-facing prose once and ignores ids, tags, audio segments, and paths', () => {
    expect(auditPracticeVocabularyCoverage(
      {
        listeningSets: [{
          id: 'phantom-phantom',
          audioSrc: '/phantom/phantom.wav',
          transcript: 'Evidence matters.',
          segments: [{ text: 'Phantom phantom.' }, { text: 'Phantom phantom.' }],
          questions: [{ prompt: 'What matters?', skillTag: 'phantom', options: ['Evidence.'] }],
        }],
      },
      [entry('evidence'), entry('matter'), entry('what')],
      { minimumOccurrences: 2 },
    )).toEqual([]);
  });

  it('keeps the shipped practice corpus covered by the foundation and core catalogs', () => {
    expect(auditPracticeVocabularyCoverage(
      {
        listeningSets: inventory.listeningSets,
        readingSets: inventory.readingSets,
        translations: inventory.translations,
        writingPrompts: inventory.writingPrompts,
      },
      [...foundationVocabulary, ...learningVocabulary],
      { minimumOccurrences: 40 },
    )).toEqual([]);
  });
});
