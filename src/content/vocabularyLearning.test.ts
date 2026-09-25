import { describe, expect, it } from 'vitest';
import rawVocabulary from '../../content/v1/vocabulary.json';
import { auditLearningVocabulary, learningVocabulary, qualityVocabularyEntry } from './vocabularyLearning';

describe('learner-facing vocabulary', () => {
  it('repairs confirmed high-risk entries without mutating the licensed source', () => {
    const rawPassage = rawVocabulary.find((entry) => entry.word === 'passage');
    const passage = learningVocabulary.find((entry) => entry.word === 'passage');
    const long = learningVocabulary.find((entry) => entry.word === 'long');

    expect(rawPassage?.meaningZh).toBe('n.通过;通路，通道');
    expect(passage).toMatchObject({
      partOfSpeech: 'n.',
      meaningZh: '文章，段落；通道，通路',
      example: 'Read the passage carefully before answering the questions.',
      exampleZh: '回答问题前请仔细阅读这篇文章。',
    });
    expect(long).toMatchObject({
      partOfSpeech: 'a./ad.',
      meaningZh: '长的；长时间的，长期地',
      example: 'It did not take long to finish the reading task.',
      exampleZh: '完成这项阅读任务没有花很长时间。',
    });
  });

  it('hides synthetic meta examples from learners', () => {
    const entry = qualityVocabularyEntry({
      id: 'v-test', word: 'sample', phonetic: '', partOfSpeech: 'n.', meaningZh: '样品',
      example: 'In a survey, “sample” is presented as a noun meaning “样品”.',
      exampleZh: '记忆提示：sample 在此处表示“样品”。', derivatives: [], confusables: [],
    });

    expect(entry.example).toBe('');
    expect(entry.exampleZh).toBe('');
  });

  it('passes the learner-facing quality audit', () => {
    expect(auditLearningVocabulary(learningVocabulary)).toEqual([]);
  });
});
