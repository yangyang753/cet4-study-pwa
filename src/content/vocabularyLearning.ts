import rawVocabulary from '../../content/v1/vocabulary.json';
import commonMeaningData from '../../content/v1/vocabulary-common-meanings.json';
import vocabularyExampleData from '../../content/v1/vocabulary-examples.json';
import type { VocabularyEntry } from '../domain/content';

const commonMeanings = commonMeaningData as Record<string, string>;
const naturalExamples = vocabularyExampleData as Record<string, Pick<VocabularyEntry, 'example' | 'exampleZh'>>;
const curatedNaturalExamples: Record<string, Pick<VocabularyEntry, 'example' | 'exampleZh'>> = {
  both: { example: 'Both answers are acceptable.', exampleZh: '两个答案都可以接受。' },
  lead: { example: 'Good teachers lead students to think independently.', exampleZh: '优秀的教师引导学生独立思考。' },
  bank: { example: 'She deposited the money in the bank.', exampleZh: '她把钱存进了银行。' },
  course: { example: 'I am taking an English course this term.', exampleZh: '这学期我正在修一门英语课程。' },
  focus: { example: 'Please focus on the main idea of the passage.', exampleZh: '请把注意力集中在文章的主旨上。' },
  local: { example: 'The local community opened a new library.', exampleZh: '当地社区开办了一座新图书馆。' },
  opportunity: { example: 'The program gives students an opportunity to volunteer.', exampleZh: '这个项目给学生提供了参加志愿服务的机会。' },
  common: { example: 'Stress is a common problem among college students.', exampleZh: '压力是大学生中常见的问题。' },
  earth: { example: 'The Earth moves around the Sun.', exampleZh: '地球绕着太阳运行。' },
  memory: { example: 'Regular review can improve your memory.', exampleZh: '定期复习可以提高记忆力。' },
  income: { example: 'Her monthly income is enough to cover the rent.', exampleZh: '她每月的收入足以支付房租。' },
  argue: { example: 'The writer argues that public transport should be improved.', exampleZh: '作者主张应当改善公共交通。' },
  either: { example: 'Either method can produce a useful result.', exampleZh: '两种方法中的任何一种都能产生有用的结果。' },
  president: { example: 'The university president welcomed the new students.', exampleZh: '大学校长欢迎新同学到来。' },
  serve: { example: 'The new center will serve the local community.', exampleZh: '这座新中心将为当地社区服务。' },
  refer: { example: 'Please refer to the chart for more information.', exampleZh: '更多信息请参阅图表。' },
  drop: { example: 'Temperatures may drop below zero tonight.', exampleZh: '今晚气温可能降到零度以下。' },
  infer: { example: 'We can infer the answer from the final paragraph.', exampleZh: '我们可以从最后一段推断出答案。' },
  associate: { example: 'Many people associate the festival with family reunions.', exampleZh: '许多人把这个节日与家庭团聚联系在一起。' },
  prefer: { example: 'Most students prefer shorter study sessions.', exampleZh: '大多数学生更喜欢时间较短的学习安排。' },
  china: { example: 'China has a long history of tea production.', exampleZh: '中国有悠久的茶叶生产历史。' },
  authority: { example: 'The local authority announced a new safety rule.', exampleZh: '地方当局公布了一项新的安全规定。' },
  lesson: { example: 'The accident taught us an important lesson.', exampleZh: '这次事故给了我们一个重要教训。' },
  gas: { example: 'Natural gas is widely used for heating.', exampleZh: '天然气被广泛用于供暖。' },
  pick: { example: 'You may pick one topic for your presentation.', exampleZh: '你可以为演讲选择一个主题。' },
  rely: { example: 'Many students rely on public transport.', exampleZh: '许多学生依靠公共交通出行。' },
  imply: { example: 'The results imply that the new method is effective.', exampleZh: '结果表明这种新方法是有效的。' },
  color: { example: 'The walls were painted a light color.', exampleZh: '墙壁被涂成了浅色。' },
  scan: { example: 'Scan the passage for names and dates.', exampleZh: '快速浏览文章，找出姓名和日期。' },
  fly: { example: 'Many students fly home during the holiday.', exampleZh: '许多学生在假期乘飞机回家。' },
  facility: { example: 'The sports facility is open to all students.', exampleZh: '这项体育设施向所有学生开放。' },
  fat: { example: 'This food is low in fat.', exampleZh: '这种食物的脂肪含量很低。' },
  artificial: { example: 'The room was lit by artificial light.', exampleZh: '房间由人工照明照亮。' },
};

// High-frequency polysemous words whose most common CET reading/listening senses
// are split across dictionary entries or absent from the imported source.
const reviewedCommonSenses: Record<string, string> = {
  passage: '文章，段落；通道，通路；通过', question: '问题；疑问；询问', people: '人；人民，民众；民族',
  section: '部分；章节；部门，科室', choice: '选择；选择权；供选择的事物',
  one: '一，一个；一个人；唯一的', make: '做，制造；使，让；成为；赚得', say: '说，讲；说明；比如说；大约',
  part: '部分；零件；角色；分开', follow: '跟随；遵循；理解；接着发生', mark: '标记；分数；迹象；给分',
  read: '阅读；读懂；显示；写着', hear: '听见；听说；审理', give: '给；提供；举办；让步',
  base: '基础；基地；以……为基础', get: '得到，取得；到达；变得；理解；使得', out: '出去；在外；熄灭；公开',
  find: '找到；发现；认为', sheet: '纸张；薄片；床单', change: '改变；变化；零钱', first: '第一；首先',
  high: '高的；高水平；高处', live: '居住；生活；现场直播；活的', line: '线；行；队伍；台词；路线',
  come: '来；发生；达到', mean: '意思是；意味着；平均的；平均值；吝啬的，刻薄的', letter: '字母；信件',
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
  process: '过程；处理', rate: '比率；评价；费率', power: '力量；权力；电力',
  lot: '许多；一批；地块；命运', control: '控制；管理；对照', hold: '拿住；持有；举办；容纳；认为',
  value: '价值；重视；数值', hand: '手；帮助；指针；递给', open: '打开；开放的；公开的；空缺的',
  fall: '落下；下降；秋天；陷入', sound: '声音；听起来；健康的；可靠的',
  light: '光；灯；点燃；轻的；浅色的', fine: '好的，优质的；细小的；罚款；处以罚款',
  present: '现在的，目前；礼物；提出，呈现；出席', address: '地址；演说；处理，应对；向……讲话',
  minute: '分钟；片刻，一会儿；微小的；详细的', even: '甚至；平坦的，均匀的；偶数的；相等的',
  problem: '问题；难题；习题', want: '想要；需要；缺少', age: '年龄；时代；变老',
  case: '情况；案例；案件；病例', issue: '问题；发布，发行；期刊；议题',
  order: '顺序；命令；订购；秩序', cover: '覆盖；包括；封面；保护',
  like: '喜欢，喜爱；像，如同；赞同；希望，想要',
  lead: '带领，引导；导致；领先',
  long: '长的；长时间的，长期地；渴望',
  choose: '选择，挑选；决定；宁愿',
  impact: '影响；冲击',
  repair: '修理，修补；修复，补救',
  buy: '买，购买；获得',
  half: '一半；一半的；部分地',
  miss: '错过；想念；未听到，未看到',
  oil: '油；石油；给……加油',
  party: '聚会；政党；一方，当事人',
  billion: '十亿',
  medicine: '药；医学',
  consume: '消耗，消费；吃完，喝光',
  debt: '债，债务；欠债',
  mail: '邮件；邮寄；邮政',
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
  v0289: {
    phonetic: '/prəˈdʒekt; ˈprɒdʒekt/', partOfSpeech: 'n./v.',
    meaningZh: '项目，工程；计划；投射；预计，规划',
    example: 'Our class is working on a project about local culture.',
    exampleZh: '我们班正在开展一个关于本地文化的项目。',
  },
  v0504: {
    phonetic: '/ˈkɒntækt; kənˈtækt/', partOfSpeech: 'n./v.',
    meaningZh: '接触；联系，联络；与……联系',
    example: 'Please contact the school office if you need help.',
    exampleZh: '如果你需要帮助，请联系学校办公室。',
  },
  v0695: {
    phonetic: '/peɪdʒ/', partOfSpeech: 'n./v.',
    meaningZh: '页，页面；给……标页码；呼叫',
    example: 'The answer is printed at the bottom of the page.',
    exampleZh: '答案印在这一页的底部。',
  },
  v0048: {
    partOfSpeech: 'v./a./n.',
    example: 'What do you mean by this sentence?',
    exampleZh: '你说的这句话是什么意思？',
  },
  v0128: { example: 'Many students buy second-hand books to save money.', exampleZh: '许多学生购买二手书来省钱。' },
  v0206: { example: 'Half of the students chose the online course.', exampleZh: '一半的学生选择了在线课程。' },
  v0284: { example: 'Do not miss the deadline for registration.', exampleZh: '不要错过报名截止日期。' },
  v0362: { example: 'The country imports most of its oil.', exampleZh: '这个国家的大部分石油依靠进口。' },
  v0401: { example: 'We held a welcome party for international students.', exampleZh: '我们为国际学生举办了一场欢迎会。' },
  v0440: { example: 'The project may cost one billion dollars.', exampleZh: '这个项目可能耗资十亿美元。' },
  v0479: { example: 'Modern medicine has saved many lives.', exampleZh: '现代医学挽救了许多人的生命。' },
  v0635: { example: 'Public buildings consume a large amount of energy.', exampleZh: '公共建筑消耗大量能源。' },
  v0674: { example: 'She worked hard to pay off her debt.', exampleZh: '她努力工作以还清债务。' },
};

const isSyntheticMetaExample = (example: string) => /\bis presented as\b/i.test(example);
const isCompleteSentenceExample = (example: string) => /[.!?][”’'"]?$/.test(example.trim());

const specialistNoise = /标准输出设备|批处理命令|批处理文件|该命令用于|文件分配表|磁盘操作系统|均方|曲率|应力|直径|网球|生殖|幼兽|铅字|鹤嘴锄|镐|幂|乘方/;

function meaningGroups(value: string) {
  const normalized = value
    .replace(/\[(?:机|计算机|网络|医|化|经|法|地质|生物|农|物|数|电子|航|军)\][^；;]*/g, '')
    .replace(/[^；;]*(?:标准输出设备|批处理命令|文件分配表|磁盘操作系统)[^；;]*/g, '')
    .replace(/(?:n|v|vt|vi|a|ad|adj|adv|pron|num|art|prep|conj|aux|modal)\./gi, '；')
    .replace(/(?<=[\u3400-\u9fff])(?:n|v|vt|vi|a|ad|adj|adv|pron|num|art|prep|conj|aux|modal)(?=[\u3400-\u9fff])/gi, '；')
    .replace(/[;；]+/g, '；')
    .replace(/^；|；$/g, '')
    .trim();
  return normalized.split('；').map((group) => group.trim()).filter(Boolean);
}

function cleanAtomicSense(value: string) {
  return value
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/^\s*(?:作|用作)?[….]*|\s+$/g, '')
    .trim();
}

function mergeMeanings(...sources: string[]) {
  const groups: string[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    for (const group of meaningGroups(source)) {
      const atoms: string[] = [];
      for (const rawSense of group.split(/[，,、]/)) {
        const sense = cleanAtomicSense(rawSense);
        const key = sense.replace(/[^\u3400-\u9fff]/g, '');
        if (!key || specialistNoise.test(sense) || seen.has(key)) continue;
        seen.add(key);
        atoms.push(sense);
        if (atoms.length === 2) break;
      }
      if (atoms.length) groups.push(atoms.join('，'));
      if (groups.length === 4) return groups.join('；');
    }
  }
  return groups.join('；');
}

function normalizePhonetic(value: string) {
  return value.replace(/[‘’]/g, "'").replace(/Λ/g, 'ʌ');
}

const irregularForms: Record<string, string[]> = {
  bring: ['brought'], buy: ['bought'], keep: ['kept'], lead: ['led'], drive: ['drove', 'driven'], break: ['broke', 'broken'], fly: ['flew', 'flown'],
};

function exampleContainsWord(example: string, word: string) {
  const forms = [word, `${word}s`, `${word}es`, `${word}d`, `${word}ed`, `${word}ing`, ...(irregularForms[word] ?? [])];
  return forms.some((form) => new RegExp(`(^|[^a-z])${form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i').test(example));
}

function contextualExample(entry: VocabularyEntry): Pick<VocabularyEntry, 'example' | 'exampleZh'> {
  const part = entry.partOfSpeech.toLowerCase();
  const meaning = entry.meaningZh.replace(/^(?:n|v|vt|vi|a|ad|adj|adv|prep|pron|num|conj|aux)\.?/i, '').replace(/[;；].*$/, '').trim();
  const targetMeaning = (meaning || entry.meaningZh).split(/[，,、]/)[0];
  const seed = [...`${entry.id}:${entry.category ?? ''}`].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const choose = (templates: Array<(word: string, meaningZh: string) => Pick<VocabularyEntry, 'example' | 'exampleZh'>>) => templates[seed % templates.length](entry.word, targetMeaning);
  if (/^(?:n\.|n\/|n$)/.test(part)) return choose([
    (word, zh) => ({ example: `The article discusses ${word} in relation to everyday choices.`, exampleZh: `文章结合日常选择讨论了${zh}。` }),
    (word, zh) => ({ example: `Researchers examined how ${word} affects students on campus.`, exampleZh: `研究人员考察了${zh}如何影响校园里的学生。` }),
    (word, zh) => ({ example: `The report highlights the importance of ${word} in modern society.`, exampleZh: `报告强调了${zh}在现代社会中的重要性。` }),
    (word, zh) => ({ example: `During the discussion, ${word} became a central concern.`, exampleZh: `讨论中，${zh}成为核心关注点。` }),
    (word, zh) => ({ example: `The survey asked students about ${word} in their daily lives.`, exampleZh: `调查询问了学生日常生活中的${zh}。` }),
    (word, zh) => ({ example: `Teachers used a real case to explain ${word} in context.`, exampleZh: `老师用真实案例解释了${zh}。` }),
  ]);
  if (/^(?:v|vt|vi)/.test(part)) return choose([
    (word, zh) => ({ example: `Students may ${word} more confidently after regular practice.`, exampleZh: `经常练习后，学生能够更自信地${zh}。` }),
    (word, zh) => ({ example: `The project asks volunteers to ${word} before Friday.`, exampleZh: `项目要求志愿者在周五前${zh}。` }),
    (word, zh) => ({ example: `Regular feedback helps learners ${word} with fewer mistakes.`, exampleZh: `定期反馈帮助学习者更准确地${zh}。` }),
    (word, zh) => ({ example: `The guide explains how to ${word} in a practical situation.`, exampleZh: `指南说明了如何在实际情境中${zh}。` }),
    (word, zh) => ({ example: `Group members decided to ${word} after comparing the options.`, exampleZh: `小组成员比较各种选择后决定${zh}。` }),
    (word, zh) => ({ example: `People often ${word} when circumstances begin to change.`, exampleZh: `情况开始变化时，人们常会${zh}。` }),
  ]);
  if (/^(?:a\.|adj)/.test(part)) return choose([
    (word, zh) => ({ example: `The result seemed ${word} after the group examined the evidence.`, exampleZh: `小组检查证据后，结果显得很${zh}。` }),
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

function cleanImportedExample(value: string) {
  return value
    .replace(/\s*\(\s*=\s*[^)]*\)\s*/gi, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function completeExample(entry: VocabularyEntry): Pick<VocabularyEntry, 'example' | 'exampleZh'> {
  const example = cleanImportedExample(entry.example).replace(/[.!?]+$/, '');
  const exampleZh = (entry.exampleZh ?? '').trim().replace(/[。！？]+$/, '');
  if (/^(?:who|what|when|where|why|how|is|are|do|does|did|can|could|will|would|should|may|might)\b/i.test(example)) {
    const question = example.replace(/\s*\([^)]*\)\s*$/, '').replace(/\?+$/, '');
    return { example: `${question}?`, exampleZh: `${exampleZh || entry.meaningZh}。` };
  }
  if (/^(?:v|vt|vi)/i.test(entry.partOfSpeech) && new RegExp(`^${entry.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(example)) {
    return {
      example: `${example.charAt(0).toUpperCase()}${example.slice(1)}.`,
      exampleZh: `${exampleZh || entry.meaningZh}。`,
    };
  }
  const seed = [...entry.id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const frames = [
    { en: 'The report mentioned', zh: '报告提到了' },
    { en: 'The article described', zh: '文章描述了' },
    { en: 'The group discussed', zh: '小组讨论了' },
    { en: 'The survey included questions about', zh: '调查包含了关于' },
  ];
  const frame = frames[seed % frames.length];
  return {
    example: `${frame.en} ${example}.`,
    exampleZh: `${frame.zh}${exampleZh || entry.meaningZh}的内容。`,
  };
}

export function qualityVocabularyEntry(entry: VocabularyEntry): VocabularyEntry {
  const source = { ...entry, ...reviewedCorrections[entry.id] };
  const word = source.word.toLowerCase();
  const priorityMeanings = reviewedCommonSenses[word];
  const corrected = {
    ...source,
    meaningZh: priorityMeanings ? mergeMeanings(priorityMeanings) : mergeMeanings(source.meaningZh, commonMeanings[word] ?? ''),
    phonetic: normalizePhonetic(source.phonetic),
    ...(!reviewedCorrections[entry.id]?.example ? curatedNaturalExamples[word] ?? naturalExamples[word] ?? {} : {}),
  };
  const cleaned = { ...corrected, example: cleanImportedExample(corrected.example) };
  if (!isSyntheticMetaExample(cleaned.example) && cleaned.example.trim()) {
    return isCompleteSentenceExample(cleaned.example) ? cleaned : { ...cleaned, ...completeExample(cleaned) };
  }
  return { ...cleaned, ...contextualExample(cleaned) };
}

export const learningVocabulary: VocabularyEntry[] = (rawVocabulary as VocabularyEntry[]).map(qualityVocabularyEntry);

export function auditLearningVocabulary(entries: VocabularyEntry[]): string[] {
  const errors: string[] = [];
  if (Object.keys(commonMeanings).length !== entries.length) errors.push(`common meanings: expected ${entries.length}, received ${Object.keys(commonMeanings).length}`);
  for (const entry of entries) {
    if (!commonMeanings[entry.word.toLowerCase()]?.trim()) errors.push(`${entry.id}: common meaning source is missing`);
    if (isSyntheticMetaExample(entry.example)) errors.push(`${entry.id}: synthetic meta example is visible`);
    if (/The lesson used|\(\s*=/i.test(entry.example)) errors.push(`${entry.id}: imported example contains dictionary scaffolding`);
    if (!entry.example.trim()) errors.push(`${entry.id}: example is missing`);
    if (!isCompleteSentenceExample(entry.example)) errors.push(`${entry.id}: example is not a complete sentence`);
    if (!exampleContainsWord(entry.example, entry.word.toLowerCase())) errors.push(`${entry.id}: example does not contain target word`);
    if (/presented as|meaning [“"]|surrounding details/i.test(entry.example) || /表示[“"]|含义是|这一动作/.test(entry.exampleZh ?? '')) errors.push(`${entry.id}: example is a definition template rather than a natural sentence`);
    if (/(?:^|[\u3400-\u9fff])(?:n|v|vt|vi|a|ad|adj|adv|pron|num|art|prep|conj|aux|modal)\./i.test(entry.meaningZh)) errors.push(`${entry.id}: meaning contains a part-of-speech label`);
    if (/(?<=[\u3400-\u9fff])(?:n|v|vt|vi|a|ad|adj|adv|pron|num|art|prep|conj|aux|modal)(?=[\u3400-\u9fff])/i.test(entry.meaningZh)) errors.push(`${entry.id}: meaning contains a part-of-speech label`);
    if (/批处理命令|批处理文件|该命令用于|标准输出设备|文件分配表|磁盘操作系统|\[(?:机|计算机)\]/.test(entry.meaningZh)) errors.push(`${entry.id}: meaning contains technical dictionary noise`);
    if (/\/(?:n|v|vt|vi|a|ad|adj|adv|pron|num)\.[^/]*[a-z]{3,}\//i.test(entry.phonetic)) errors.push(`${entry.id}: phonetic contains another dictionary headword`);
    if (/[‘’Λ]/.test(entry.phonetic)) errors.push(`${entry.id}: phonetic contains a nonstandard symbol`);
    const senses = entry.meaningZh.split(/[；，、]/).map((sense) => sense.replace(/[^\u3400-\u9fff]/g, '')).filter(Boolean);
    if (new Set(senses).size !== senses.length) errors.push(`${entry.id}: meaning contains duplicated senses`);
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
