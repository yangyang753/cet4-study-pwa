import rawVocabulary from '../../content/v1/vocabulary.json';
import commonMeaningData from '../../content/v1/vocabulary-common-meanings.json';
import type { VocabularyEntry } from '../domain/content';

const commonMeanings = commonMeaningData as Record<string, string>;

// High-frequency polysemous words whose most common CET reading/listening senses
// are split across dictionary entries or absent from the imported source.
const reviewedCommonSenses: Record<string, string> = {
  one: '一，一个；一个人；唯一的', make: '做，制造；使，让；成为；赚得', say: '说，讲；说明；比如说；大约',
  part: '部分；零件；角色；分开', follow: '跟随；遵循；理解；接着发生', mark: '标记；分数；迹象；给分',
  read: '阅读；读懂；显示；写着', hear: '听见；听说；审理', give: '给；提供；举办；让步',
  base: '基础；基地；以……为基础', get: '得到，取得；到达；变得；理解；使得', out: '出去；在外；熄灭；公开',
  find: '找到；发现；认为', sheet: '纸张；薄片；床单', change: '改变；变化；零钱', first: '第一；首先',
  high: '高的；高水平；高处', live: '居住；生活；现场直播；活的', line: '线；行；队伍；台词；路线',
  come: '来；发生；达到', mean: '意思是；意味着；平均的；吝啬的；平均值', letter: '字母；信件',
  end: '结束；末端；目的', company: '公司；陪伴；同伴', look: '看；看起来；外表',
  business: '商业；事务；职责', own: '自己的；拥有；承认', feel: '感觉；认为；触摸',
  home: '家；故乡；在家；本土', last: '最后的；上一个；持续', place: '地方；放置；名次',
  pay: '支付；工资；有利可图', keep: '保持；保留；遵守；饲养', book: '书；预订',
  put: '放置；表达；使处于', blank: '空白；空白的；茫然的', report: '报告；报道；报到',
  public: '公共的；公众', far: '远；很大程度上', call: '打电话；称呼；呼叫；要求',
  leave: '离开；留下；假期；使处于', cause: '导致；原因；事业', down: '向下；下降；情绪低落',
  bank: '银行；岸；堆', hard: '努力地；困难的；坚硬的', class: '班级；课程；阶级；类别',
  cost: '花费；成本；代价', group: '组；群体；把……分组', play: '玩；演奏；扮演；戏剧',
  course: '课程；过程；路线；一道菜', offer: '提供；提议；报价', experience: '经历；经验；体验',
  care: '关心；照料；小心', program: '程序；节目；计划', market: '市场；推销',
  kind: '种类；友善的', form: '形式；表格；形成', face: '脸；面对；表面',
  process: '过程；处理', rate: '比率；评价；费率', power: '力量；权力；电力；幂',
  lot: '许多；一批；地块；命运', control: '控制；管理；对照', hold: '拿住；持有；举办；容纳；认为',
  value: '价值；重视；数值', hand: '手；帮助；指针；递给', open: '打开；开放的；公开的；空缺的',
  fall: '落下；下降；秋天；陷入', sound: '声音；听起来；健康的；可靠的',
  light: '光；灯；点燃；轻的；浅色的', fine: '好的，优质的；细小的；罚款；处以罚款',
  present: '现在的；目前；礼物；提出；呈现；出席的', address: '地址；演说；处理，应对；向……讲话',
};

const reviewedCorrections: Record<string, Partial<VocabularyEntry>> = {
  v0001: {
    partOfSpeech: 'n.',
    meaningZh: '文章，段落；通道，通路；通过',
    example: 'Read the passage carefully before answering the questions.',
    exampleZh: '回答问题前请仔细阅读这篇文章。',
  },
  v0030: {
    partOfSpeech: 'a./ad.',
    meaningZh: '长的；长时间的，长期地',
    example: 'It did not take long to finish the reading task.',
    exampleZh: '完成这项阅读任务没有花很长时间。',
  },
  v0026: {
    partOfSpeech: 'prep./v.',
    meaningZh: '像，如同；喜欢，喜爱；赞同；希望；像要',
    example: 'Many students like the idea because it feels like a practical solution.',
    exampleZh: '许多学生喜欢并赞同这个想法，因为它像是一个切实可行的解决办法。',
  },
  v0470: { meaningZh: '地址；演说；处理，应对；向……讲话' },
  v0495: { meaningZh: '穿，戴；磨损；耐用，经受' },
  v0648: { meaningZh: '选择，挑选；采摘；捡起；接人' },
};

const isSyntheticMetaExample = (example: string) => /\bis presented as\b/i.test(example);

function normalizeMeaning(value: string) {
  const normalized = value
    .replace(/(?:n|v|vt|vi|a|ad|adj|adv|pron|num|art|prep|conj|aux|modal)\./gi, '；')
    .replace(/[;；]+/g, '；')
    .replace(/^；|；$/g, '')
    .trim();
  return [...new Set(normalized.split('；').map((meaning) => meaning.trim()).filter(Boolean))].join('；');
}

function mergeMeanings(primary: string, ...supplements: string[]) {
  const merged = normalizeMeaning(primary).split('；').filter(Boolean);
  const covered = () => merged.join('，').replace(/[^\u3400-\u9fff]/g, '');
  for (const fragment of normalizeMeaning(supplements.join('；')).split('；').filter(Boolean)) {
    const senses = fragment.split(/[，,、]/).map((sense) => sense.replace(/[^\u3400-\u9fff]/g, '')).filter(Boolean);
    if (!senses.length || !senses.every((sense) => covered().includes(sense))) merged.push(fragment);
  }
  return normalizeMeaning(merged.join('；'));
}

function normalizePhonetic(value: string) {
  return value.replace(/[‘’]/g, "'").replace(/Λ/g, 'ʌ');
}

function contextualExample(entry: VocabularyEntry): Pick<VocabularyEntry, 'example' | 'exampleZh'> {
  const part = entry.partOfSpeech.toLowerCase();
  const meaning = entry.meaningZh.replace(/^(?:n|v|vt|vi|a|ad|adj|adv|prep|pron|num|conj|aux)\.?/i, '').replace(/[;；].*$/, '').trim();
  const targetMeaning = meaning || entry.meaningZh;
  const seed = [...`${entry.id}:${entry.category ?? ''}`].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const choose = (templates: Array<(word: string, meaningZh: string) => Pick<VocabularyEntry, 'example' | 'exampleZh'>>) => templates[seed % templates.length](entry.word, targetMeaning);
  if (/^(?:n\.|n\/|n$)/.test(part)) return choose([
    (word, zh) => ({ example: `The article discusses ${word} in relation to everyday choices.`, exampleZh: `文章联系日常选择讨论了“${zh}”。` }),
    (word, zh) => ({ example: `Researchers examined how ${word} affects students on campus.`, exampleZh: `研究人员考察了“${zh}”如何影响校园里的学生。` }),
    (word, zh) => ({ example: `The report highlights the importance of ${word} in modern society.`, exampleZh: `报告强调了“${zh}”在现代社会中的重要性。` }),
    (word, zh) => ({ example: `During the discussion, ${word} became a central concern.`, exampleZh: `讨论中，“${zh}”成为核心关注点。` }),
    (word, zh) => ({ example: `The survey asked students about ${word} in their daily lives.`, exampleZh: `调查询问了学生日常生活中的“${zh}”。` }),
    (word, zh) => ({ example: `Teachers used a real case to explain ${word} in context.`, exampleZh: `老师用真实案例在语境中解释“${zh}”。` }),
  ]);
  if (/^(?:v|vt|vi)/.test(part)) return choose([
    (word, zh) => ({ example: `Students may ${word} more confidently after regular practice.`, exampleZh: `经常练习后，学生能更自信地完成“${zh}”这一动作。` }),
    (word, zh) => ({ example: `The project asks volunteers to ${word} before Friday.`, exampleZh: `项目要求志愿者在周五前完成“${zh}”。` }),
    (word, zh) => ({ example: `Regular feedback helps learners ${word} with fewer mistakes.`, exampleZh: `定期反馈帮助学习者更少出错地“${zh}”。` }),
    (word, zh) => ({ example: `The guide explains how to ${word} in a practical situation.`, exampleZh: `指南解释了如何在实际情境中“${zh}”。` }),
    (word, zh) => ({ example: `Group members decided to ${word} after comparing the options.`, exampleZh: `小组成员比较选项后决定“${zh}”。` }),
    (word, zh) => ({ example: `People often ${word} when circumstances begin to change.`, exampleZh: `情况开始变化时，人们常会“${zh}”。` }),
  ]);
  if (/^(?:a\.|adj)/.test(part)) return choose([
    (word, zh) => ({ example: `The result seemed ${word} after the group examined the evidence.`, exampleZh: `小组检查证据后，结果显得“${zh}”。` }),
    (word, zh) => ({ example: `Students described the new learning method as ${word}.`, exampleZh: `学生把这种新学习方法描述为“${zh}”。` }),
    (word, zh) => ({ example: `A ${word} response can change the direction of the discussion.`, exampleZh: `一个“${zh}”的回应可能改变讨论方向。` }),
    (word, zh) => ({ example: `The difference became ${word} when the figures were compared.`, exampleZh: `对比数据后，差异变得“${zh}”。` }),
    (word, zh) => ({ example: `The committee considered the proposal ${word} for the community.`, exampleZh: `委员会认为该提案对社区而言“${zh}”。` }),
    (word, zh) => ({ example: `It was ${word} to review the evidence before making a decision.`, exampleZh: `作决定前审查证据是“${zh}”的。` }),
  ]);
  if (/^(?:ad\.|adv)/.test(part)) return choose([
    (word, zh) => ({ example: `The team responded ${word} when the schedule changed.`, exampleZh: `日程变化时，团队以“${zh}”的方式回应。` }),
    (word, zh) => ({ example: `The speaker explained the main point ${word} during the interview.`, exampleZh: `采访中，说话者以“${zh}”的方式解释要点。` }),
    (word, zh) => ({ example: `Students worked ${word} to finish the shared task.`, exampleZh: `学生以“${zh}”的方式完成共同任务。` }),
    (word, zh) => ({ example: `The situation changed ${word} after the announcement.`, exampleZh: `通知发布后，情况以“${zh}”的方式发生变化。` }),
    (word, zh) => ({ example: `The report was ${word} discussed in the following meeting.`, exampleZh: `这份报告在后续会议中被“${zh}”地讨论。` }),
    (word, zh) => ({ example: `The instructions were followed ${word} throughout the activity.`, exampleZh: `整个活动中，大家以“${zh}”的方式遵循说明。` }),
  ]);
  return choose([
    (word, zh) => ({ example: `In this passage, "${word}" helps connect two important ideas.`, exampleZh: `在这篇文章中，“${word}”用于连接重要含义“${zh}”。` }),
    (word, zh) => ({ example: `The lecturer used "${word}" while explaining the main point.`, exampleZh: `讲师解释要点时使用了“${word}”，含义是“${zh}”。` }),
    (word, zh) => ({ example: `Learners noticed "${word}" in a sentence about campus life.`, exampleZh: `学习者在校园生活语境中注意到“${word}”，其含义是“${zh}”。` }),
    (word, zh) => ({ example: `The context makes the meaning of "${word}" easier to remember.`, exampleZh: `语境让“${word}”所表达的“${zh}”更容易记忆。` }),
    (word, zh) => ({ example: `A question in the lesson includes "${word}" as a key signal.`, exampleZh: `课程中的题目把“${word}”作为表达“${zh}”的关键信号。` }),
    (word, zh) => ({ example: `Readers used the surrounding details to understand "${word}".`, exampleZh: `读者利用上下文理解“${word}”所表达的“${zh}”。` }),
  ]);
}

export function qualityVocabularyEntry(entry: VocabularyEntry): VocabularyEntry {
  const source = { ...entry, ...reviewedCorrections[entry.id] };
  const corrected = { ...source, meaningZh: mergeMeanings(source.meaningZh, commonMeanings[source.word.toLowerCase()] ?? '', reviewedCommonSenses[source.word.toLowerCase()] ?? ''), phonetic: normalizePhonetic(source.phonetic) };
  if (!isSyntheticMetaExample(corrected.example) && corrected.example.trim()) return corrected;
  return { ...corrected, ...contextualExample(corrected) };
}

export const learningVocabulary: VocabularyEntry[] = (rawVocabulary as VocabularyEntry[]).map(qualityVocabularyEntry);

export function auditLearningVocabulary(entries: VocabularyEntry[]): string[] {
  const errors: string[] = [];
  for (const entry of entries) {
    if (isSyntheticMetaExample(entry.example)) errors.push(`${entry.id}: synthetic meta example is visible`);
    if (!entry.example.trim()) errors.push(`${entry.id}: example is missing`);
    if (!entry.example.toLowerCase().includes(entry.word.toLowerCase())) errors.push(`${entry.id}: example does not contain target word`);
    if (/(?:^|[\u3400-\u9fff])(?:n|v|vt|vi|a|ad|adj|adv|pron|num|art|prep|conj|aux|modal)\./i.test(entry.meaningZh)) errors.push(`${entry.id}: meaning contains a part-of-speech label`);
    if (/[‘’Λ]/.test(entry.phonetic)) errors.push(`${entry.id}: phonetic contains a nonstandard symbol`);
  }
  const passage = entries.find((entry) => entry.id === 'v0001');
  if (!passage?.meaningZh.includes('文章')) errors.push('v0001: missing common reading sense');
  const long = entries.find((entry) => entry.id === 'v0030');
  if (!long?.meaningZh.includes('长的')) errors.push('v0030: missing common adjective sense');
  const like = entries.find((entry) => entry.word.toLowerCase() === 'like');
  if (!like || !['像', '喜欢', '赞同'].every((meaning) => like.meaningZh.includes(meaning))) errors.push('like: missing common senses');
  for (const [word, senses] of Object.entries({ wear: ['穿', '戴'], pick: ['选择', '挑选'], address: ['地址', '处理'] })) {
    const entry = entries.find((item) => item.word.toLowerCase() === word);
    if (!entry || !senses.every((sense) => entry.meaningZh.includes(sense))) errors.push(`${word}: missing common senses`);
  }
  for (const [word, senses] of Object.entries({ sound: ['声音', '听起来'], light: ['光', '点燃'], get: ['得到', '理解'], fine: ['好的', '罚款'] })) {
    const entry = entries.find((item) => item.word.toLowerCase() === word);
    if (!entry || !senses.every((sense) => entry.meaningZh.includes(sense))) errors.push(`${word}: missing reviewed common senses`);
  }
  return errors;
}
