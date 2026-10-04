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
      id: 'v-test', word: 'samplestone', phonetic: '', partOfSpeech: 'n.', meaningZh: '样品',
      example: 'In a survey, “samplestone” is presented as a noun meaning “样品”.',
      exampleZh: '记忆提示：samplestone 在此处表示“样品”。', derivatives: [], confusables: [],
    });

    expect(entry.example).toContain('samplestone');
    expect(entry.example).not.toContain('is presented as');
    expect(entry.exampleZh).toContain('样品');
    expect(entry.exampleZh).not.toMatch(/[“”][^“”]+[“”]/);
  });

  it('deduplicates atomic meanings and puts reviewed CET senses first', () => {
    const mean = learningVocabulary.find((entry) => entry.word === 'mean');
    const like = learningVocabulary.find((entry) => entry.word === 'like');

    expect(mean?.meaningZh.startsWith('意思是；意味着')).toBe(true);
    expect(mean?.meaningZh.match(/平均的/g)).toHaveLength(1);
    expect(like?.meaningZh.startsWith('喜欢，喜爱；像，如同')).toBe(true);
    expect(like?.meaningZh.match(/喜欢/g)).toHaveLength(1);
    expect(like?.meaningZh).not.toContain('像要');
    expect(learningVocabulary.find((entry) => entry.word === 'power')?.meaningZh).not.toContain('幂');
    expect(learningVocabulary.find((entry) => entry.word === 'pick')?.meaningZh).not.toMatch(/镐|鹤嘴锄/);
    expect(Math.max(...learningVocabulary.map((entry) => entry.meaningZh.split('；').length))).toBeLessThanOrEqual(4);
  });

  it('uses a natural bilingual sentence instead of a definition template', () => {
    const mean = learningVocabulary.find((entry) => entry.word === 'mean');
    expect(mean?.example).toMatch(/\bmean(?:s|t|ing)?\b/i);
    expect(mean?.example).not.toMatch(/presented as|meaning [“"]|surrounding details/i);
    expect(mean?.exampleZh).not.toMatch(/表示[“"]|含义是|语境|这一动作/);
    expect(mean?.exampleZh).toMatch(/[。！？]$/);
  });

  it('repairs source rows that accidentally swallowed the following headword', () => {
    expect(learningVocabulary.find((entry) => entry.id === 'v0289')).toMatchObject({
      word: 'project',
      phonetic: '/prəˈdʒekt; ˈprɒdʒekt/',
      partOfSpeech: 'n./v.',
      example: 'Our class is working on a project about local culture.',
      exampleZh: '我们班正在开展一个关于本地文化的项目。',
    });
    expect(learningVocabulary.find((entry) => entry.id === 'v0289')?.meaningZh).toContain('项目');
    expect(learningVocabulary.find((entry) => entry.id === 'v0289')?.meaningZh).not.toContain('突出');

    expect(learningVocabulary.find((entry) => entry.id === 'v0504')).toMatchObject({
      word: 'contact',
      phonetic: '/ˈkɒntækt; kənˈtækt/',
      partOfSpeech: 'n./v.',
      example: 'Please contact the school office if you need help.',
      exampleZh: '如果你需要帮助，请联系学校办公室。',
    });
    expect(learningVocabulary.find((entry) => entry.id === 'v0504')?.meaningZh).not.toContain('包含');

    expect(learningVocabulary.find((entry) => entry.id === 'v0695')).toMatchObject({
      word: 'page',
      phonetic: '/peɪdʒ/',
      partOfSpeech: 'n./v.',
      example: 'The answer is printed at the bottom of the page.',
      exampleZh: '答案印在这一页的底部。',
    });
    expect(learningVocabulary.find((entry) => entry.id === 'v0695')?.meaningZh).not.toContain('疼痛');
  });

  it('removes technical dictionary noise from learner-facing common meanings', () => {
    const noisy = /批处理命令|标准输出设备|文件分配表|磁盘操作系统|\[机\]/;
    expect(learningVocabulary.filter((entry) => noisy.test(entry.meaningZh))).toEqual([]);
    expect(Object.entries(commonMeaningData as Record<string, string>).filter(([, meaning]) => noisy.test(meaning))).toEqual([]);
  });

  it('flags cross-headword phonetics, technical noise and glued part-of-speech labels', () => {
    const base = learningVocabulary[0];
    const sample = [
      { ...base, id: 'bad-phonetic', phonetic: '/peɪdʒ/n.页pain/pein/' },
      { ...base, id: 'bad-noise', meaningZh: '寻找；输出到标准输出设备上' },
      { ...base, id: 'bad-pos', meaningZh: '一pron.一个人' },
    ];
    expect(auditLearningVocabulary(sample)).toEqual(expect.arrayContaining([
      expect.stringContaining('bad-phonetic: phonetic contains another dictionary headword'),
      expect.stringContaining('bad-noise: meaning contains technical dictionary noise'),
      expect.stringContaining('bad-pos: meaning contains a part-of-speech label'),
    ]));
  });

  it('combines the common meanings of polysemous CET-4 words', () => {
    const like = learningVocabulary.find((entry) => entry.word === 'like');
    expect(like?.meaningZh).toContain('像');
    expect(like?.meaningZh).toContain('喜欢');
    expect(like?.meaningZh).toContain('赞同');
    expect(learningVocabulary.find((entry) => entry.word === 'wear')?.meaningZh).toContain('穿');
    expect(learningVocabulary.find((entry) => entry.word === 'pick')?.meaningZh).toContain('选择');
    expect(learningVocabulary.find((entry) => entry.word === 'pick')?.meaningZh).not.toMatch(/镐|鹤嘴锄/);
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
    expect(auditLearningVocabulary(learningVocabulary).filter((error) => error.includes('example does not contain target word'))).toEqual([]);
  });

  it('uses varied deterministic contexts instead of repeating five sentences across the library', () => {
    const shapes = learningVocabulary.slice(0, 300).map((entry) => entry.example.toLowerCase().replaceAll(entry.word.toLowerCase(), '<word>'));
    expect(new Set(shapes).size).toBeGreaterThanOrEqual(20);
  });

  it('passes the learner-facing quality audit', () => {
    expect(auditLearningVocabulary(learningVocabulary)).toEqual([]);
  });

  it('uses source-backed or individually curated sentences for the whole library', () => {
    const generic = /article discusses|researchers examined how|report highlights the importance|during the discussion|survey asked students about|teachers used a real case|students may .* after regular practice|project asks volunteers|regular feedback helps learners|guide explains how to|group members decided to|people often .* circumstances/;
    expect(learningVocabulary.filter((entry) => generic.test(entry.example.toLowerCase()))).toEqual([]);
  });

  it('contains no repeated atomic Chinese sense in any learner-facing entry', () => {
    const repeated = learningVocabulary.flatMap((entry) => {
      const senses = entry.meaningZh.split(/[；，、]/).map((item) => item.replace(/[^\u3400-\u9fff]/g, '')).filter(Boolean);
      return new Set(senses).size === senses.length ? [] : [entry.word];
    });
    expect(repeated).toEqual([]);
  });
});
