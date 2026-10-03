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
    expect(buildWordReinforcement(word, () => 0.99).kind).toBe('cloze');
  });

  it('never hides both the English word and its Chinese meaning', () => {
    const exercises = Array.from({ length: 100 }, (_, index) => buildWordReinforcement(word, () => index / 100));
    expect(exercises.map((exercise) => exercise.kind)).not.toContain('dual');
  });

  it('requires exact spelling while accepting equivalent meaning wording', () => {
    const spelling = buildWordReinforcement(word, () => 0.4);
    expect(gradeWordReinforcement(spelling, { english: 'pasage', chinese: '' }).correct).toBe(false);
    expect(gradeWordReinforcement(spelling, { english: 'passage', chinese: '' }).correct).toBe(true);

    const meaning = buildWordReinforcement(word, () => 0);
    expect(gradeWordReinforcement(meaning, { english: '', chinese: '短文' })).toMatchObject({
      correct: true,
      matchedMeaningCount: 1,
      requiredMeaningCount: 1,
      remainingMeanings: [],
    });
    expect(gradeWordReinforcement(meaning, { english: '', chinese: '道路' }).correct).toBe(false);
  });

  it('creates a usable random cloze without revealing the complete word', () => {
    const exercise = buildWordReinforcement(word, () => 0.75);
    expect(exercise.cloze).toContain('_');
    expect(exercise.cloze).not.toBe(word.word);
    expect(exercise.cloze.match(/_+/g)).toHaveLength(1);
  });

  it('changes cloze positions when the random offset changes', () => {
    const sequence = (...values: number[]) => () => values.shift() ?? 0;
    const left = buildWordReinforcement(word, sequence(0.75, 0.1, 0));
    const right = buildWordReinforcement(word, sequence(0.75, 0.1, 0.7));
    expect(left.kind).toBe('cloze');
    expect(right.kind).toBe('cloze');
    expect(left.cloze).not.toBe(right.cloze);
  });

  it('keeps a hyphenated word to one continuous blank', () => {
    const sequence = (...values: number[]) => () => values.shift() ?? 0;
    const exercise = buildWordReinforcement({ ...word, id: 'v2', word: 'well-being' }, sequence(0.99, 0.99, 0));
    expect(exercise.kind).toBe('cloze');
    expect(exercise.cloze.match(/_+/g)).toHaveLength(1);
  });
});
