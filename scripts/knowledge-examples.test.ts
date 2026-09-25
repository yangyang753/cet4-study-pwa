import { describe, expect, it } from 'vitest';
import { buildCollocationExample, buildVocabularyExample } from './knowledge-examples.mts';

describe('knowledge example generation', () => {
  it('uses a grammatically safe context cue when a word sense is not curated', () => {
    expect(buildVocabularyExample({ word: 'make', partOfSpeech: 'vt.', meaningZh: 'vt.使;做，制造' }, 0).example)
      .toBe('In a campus survey, “make” is presented as a verb meaning “使;做，制造”.');
    expect(buildVocabularyExample({ word: 'other', partOfSpeech: 'a.', meaningZh: 'a.另外的;其余的' }, 1).example)
      .toBe('In a class discussion, “other” is presented as an adjective meaning “另外的;其余的”.');
  });

  it('keeps required prepositions in common collocation examples', () => {
    expect(buildCollocationExample('take part in').example).toContain('take part in campus activities');
    expect(buildCollocationExample('benefit from').example).toContain('benefit from regular practice');
    expect(buildCollocationExample('contribute to').example).toContain('contribute to better results');
    expect(buildCollocationExample('be responsible for').example).toContain('responsible for organizing');
  });
});
