import { describe, expect, it } from 'vitest';
import rawVocabulary from '../../content/v1/vocabulary.json';
import commonMeaningData from '../../content/v1/vocabulary-common-meanings.json';
import { auditLearningVocabulary, learningVocabulary, qualityVocabularyEntry } from './vocabularyLearning';

describe('learner-facing vocabulary', () => {
  it('repairs confirmed high-risk entries without mutating the licensed source', () => {
    const rawPassage = rawVocabulary.find((entry) => entry.word === 'passage');
    const passage = learningVocabulary.find((entry) => entry.word === 'passage');
    const long = learningVocabulary.find((entry) => entry.word === 'long');

    expect(rawPassage?.meaningZh).toBe('n.通过;通路，通道');
    expect(passage).toMatchObject({
      partOfSpeech: 'n.',
      example: 'Read the passage carefully before answering the questions.',
      exampleZh: '回答问题前请仔细阅读这篇文章。',
    });
    expect(passage?.meaningZh).toContain('文章，段落');
    expect(passage?.meaningZh).toContain('通道，通路');
    expect(passage?.meaningZh).toContain('通过');
    expect(long).toMatchObject({
      partOfSpeech: 'a./ad.',
      example: 'It did not take long to finish the reading task.',
      exampleZh: '完成这项阅读任务没有花很长时间。',
    });
    expect(long?.meaningZh).toContain('长的');
    expect(long?.meaningZh).toContain('长期地');
  });

  it('replaces synthetic meta examples with a usable contextual sentence', () => {
    const entry = qualityVocabularyEntry({
      id: 'v-test', word: 'sample', phonetic: '', partOfSpeech: 'n.', meaningZh: '样品',
      example: 'In a survey, “sample” is presented as a noun meaning “样品”.',
      exampleZh: '记忆提示：sample 在此处表示“样品”。', derivatives: [], confusables: [],
    });

    expect(entry.example).toContain('sample');
    expect(entry.example).not.toContain('is presented as');
    expect(entry.exampleZh).toContain('样品');
  });

  it('combines the common meanings of polysemous CET-4 words', () => {
    const like = learningVocabulary.find((entry) => entry.word === 'like');
    expect(like?.meaningZh).toContain('像');
    expect(like?.meaningZh).toContain('喜欢');
    expect(like?.meaningZh).toContain('赞同');
    expect(learningVocabulary.find((entry) => entry.word === 'wear')?.meaningZh).toContain('穿');
    expect(learningVocabulary.find((entry) => entry.word === 'pick')?.meaningZh).toContain('选择');
    expect(learningVocabulary.find((entry) => entry.word === 'pick')?.meaningZh).toContain('镐');
    expect(learningVocabulary.find((entry) => entry.word === 'long')?.meaningZh).toContain('渴望');
    expect(learningVocabulary.find((entry) => entry.word === 'address')?.meaningZh).toContain('处理');
    expect(learningVocabulary.find((entry) => entry.word === 'sound')?.meaningZh).toEqual(expect.stringMatching(/声音|听起来/));
    expect(learningVocabulary.find((entry) => entry.word === 'light')?.meaningZh).toContain('光');
    expect(learningVocabulary.find((entry) => entry.word === 'get')?.meaningZh).toContain('得到');
    expect(learningVocabulary.find((entry) => entry.word === 'fine')?.meaningZh).toContain('好的');
    expect(learningVocabulary.find((entry) => entry.word === 'passage')?.meaningZh).not.toContain('通过；通路，通道');
  });

  it('ships a source-backed common-meaning record for all 800 words', () => {
    const meanings = commonMeaningData as Record<string, string>;
    expect(Object.keys(meanings)).toHaveLength(800);
    expect(rawVocabulary.every((entry) => meanings[entry.word.toLowerCase()]?.trim())).toBe(true);
  });

  it('keeps the frequent senses of representative polysemous words', () => {
    const expected: Record<string, string[]> = {
      make: ['做', '使', '赚'],
      get: ['得到', '到达', '变得', '理解'],
      mean: ['意思', '意味着', '平均'],
      hold: ['拿', '举办', '容纳'],
      present: ['现在', '礼物', '提出', '出席'],
      light: ['光', '点燃', '轻'],
      sound: ['声音', '听起来', '可靠'],
      address: ['地址', '演说', '处理'],
    };
    for (const [word, senses] of Object.entries(expected)) {
      const meaning = learningVocabulary.find((entry) => entry.word === word)?.meaningZh ?? '';
      expect(meaning, word).toEqual(expect.stringContaining(senses[0]));
      for (const sense of senses.slice(1)) expect(meaning, `${word}: ${sense}`).toContain(sense);
    }
  });

  it('removes duplicated part-of-speech labels and normalizes phonetic symbols', () => {
    const entry = qualityVocabularyEntry({
      id: 'v-clean', word: 'one', phonetic: '/wΛn/', partOfSpeech: 'num./pron.', meaningZh: 'num.一pron.一个人',
      example: 'The word “one” is presented as a number.', exampleZh: '', derivatives: [], confusables: [],
    });
    expect(entry.meaningZh).toContain('一');
    expect(entry.meaningZh).toContain('一个人');
    expect(entry.meaningZh).toContain('唯一的');
    expect(entry.meaningZh).not.toMatch(/(?:num|pron)\./i);
    expect(entry.phonetic).toBe('/wʌn/');
  });

  it('provides a visible example for every high-frequency word', () => {
    expect(learningVocabulary.filter((entry) => !entry.example.trim())).toEqual([]);
    expect(learningVocabulary.filter((entry) => !entry.example.toLowerCase().includes(entry.word.toLowerCase()))).toEqual([]);
  });

  it('uses varied deterministic contexts instead of repeating five sentences across the library', () => {
    const shapes = learningVocabulary.slice(0, 300).map((entry) => entry.example.toLowerCase().replaceAll(entry.word.toLowerCase(), '<word>'));
    expect(new Set(shapes).size).toBeGreaterThanOrEqual(20);
  });

  it('passes the learner-facing quality audit', () => {
    expect(auditLearningVocabulary(learningVocabulary)).toEqual([]);
  });
});
