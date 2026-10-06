import { describe, expect, it } from 'vitest';
import { foundationVocabulary } from '../../content/foundationVocabulary';
import { learningVocabulary } from '../../content/vocabularyLearning';
import { catalogForLayer, vocabularyLayerOf } from './vocabularyLayer';

describe('vocabularyLayer', () => {
  it('resolves stable IDs to separate catalogs', () => {
    expect(vocabularyLayerOf('f0001')).toBe('foundation');
    expect(vocabularyLayerOf('v0001')).toBe('core');
    expect(catalogForLayer('foundation')).toBe(foundationVocabulary);
    expect(catalogForLayer('core')).toBe(learningVocabulary);
  });

  it('treats legacy non-foundation IDs as core', () => {
    expect(vocabularyLayerOf('legacy-word')).toBe('core');
  });
});
