import { describe, expect, it } from 'vitest';
import type { VocabularyEntry } from '../../domain/content';
import { buildWordReinforcement, gradeWordReinforcement } from './wordReinforcement';

const word: VocabularyEntry = {
  id: 'v1', word: 'passage', phonetic: "/'pæsɪdʒ/", partOfSpeech: 'n.',
  meaningZh: '文章，段落', example: 'Read the passage.', derivatives: [], confusables: [],
};

describe('word reinforcement', () => {
  it('selects different recall formats from the supplied random value', () => {
    expect(buildWordReinforcement(word, () => 0).kind).toBe('meaning');
    expect(buildWordReinforcement(word, () => 0.4).kind).toBe('spelling');
    expect(buildWordReinforcement(word, () => 0.75).kind).toBe('cloze');
    expect(buildWordReinforcement(word, () => 0.99).kind).toBe('dual');
  });

  it('requires exact spelling and every listed meaning', () => {
    const spelling = buildWordReinforcement(word, () => 0.4);
    expect(gradeWordReinforcement(spelling, { english: 'pasage', chinese: '' }).correct).toBe(false);
    expect(gradeWordReinforcement(spelling, { english: 'passage', chinese: '' }).correct).toBe(true);

    const meaning = buildWordReinforcement(word, () => 0);
    expect(gradeWordReinforcement(meaning, { english: '', chinese: '文章' }).missingMeanings).toEqual(['段落']);
    expect(gradeWordReinforcement(meaning, { english: '', chinese: '文章和段落' }).correct).toBe(true);
  });

  it('creates a usable random cloze without revealing the complete word', () => {
    const exercise = buildWordReinforcement(word, () => 0.75);
    expect(exercise.cloze).toContain('_');
    expect(exercise.cloze).not.toBe(word.word);
  });

  it('changes cloze positions when the random offset changes', () => {
    const sequence = (...values: number[]) => () => values.shift() ?? 0;
    const left = buildWordReinforcement(word, sequence(0.75, 0.1, 0));
    const right = buildWordReinforcement(word, sequence(0.75, 0.1, 0.7));
    expect(left.kind).toBe('cloze');
    expect(right.kind).toBe('cloze');
    expect(left.cloze).not.toBe(right.cloze);
  });
});
