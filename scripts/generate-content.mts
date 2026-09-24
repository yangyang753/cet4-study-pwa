import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const frequencyPath = path.join(root, 'tmp/cet-vocabulary/cet_full_list.json');
const dictionaryDir = path.join(root, 'tmp/cet4-memory/words');
const outputDir = path.join(root, 'content/v1');

const frequency = JSON.parse(await readFile(frequencyPath, 'utf8'))['四六级词汇词频排序表'] as Array<Record<string, unknown>>;
const dictionaryFiles = (await readdir(dictionaryDir)).filter((file) => file.endsWith('.json'));
const dictionaryEntries = (await Promise.all(dictionaryFiles.map(async (file) => JSON.parse(await readFile(path.join(dictionaryDir, file), 'utf8'))))).flat() as Array<{ word: string; mean: string; phonetic_symbol: string }>;
const dictionary = new Map(dictionaryEntries.map((entry) => [entry.word.toLowerCase(), entry]));
const stop = new Set('the and for with from that this these those have has had are was were been being into onto but not you your their they them our ours who whom whose which what when where why how can could would should may might must will shall all any some each every few many much more most less least very too also only just than then there here'.split(' '));

const vocabulary = frequency
  .filter((entry) => !entry['六级'])
  .map((entry) => ({ rank: Number(entry['序号']), frequency: Number(entry['词频']), word: String(entry['单词']).toLowerCase(), category: String(entry['分类'] ?? '通用'), subcategory: String(entry['子分类'] ?? '') }))
  .filter((entry) => /^[a-z][a-z-]+$/.test(entry.word) && entry.word.length >= 3 && !stop.has(entry.word) && dictionary.has(entry.word))
  .slice(0, 800)
  .map((entry, index) => {
    const detail = dictionary.get(entry.word)!;
    const part = detail.mean.match(/^([a-z.]+)/i)?.[1] ?? 'word';
    return { id: `v${String(index + 1).padStart(4, '0')}`, word: entry.word, phonetic: detail.phonetic_symbol || `/${entry.word}/`, partOfSpeech: part, meaningZh: detail.mean, example: `The word “${entry.word}” often appears in college English reading and listening.`, derivatives: [], confusables: [], frequency: entry.frequency, category: entry.category, subcategory: entry.subcategory, source: 'exam-data/CETVocabulary + doupoa/CET-4-Auxiliary-Memory' };
  });

const phraseText = `take part in|参加
play an important role in|在……中发挥重要作用
make a difference|产生影响
be responsible for|对……负责
provide somebody with something|向某人提供某物
benefit from|从……中受益
contribute to|有助于；促成
lead to|导致
result in|导致
result from|由……引起
focus on|专注于
depend on|依靠；取决于
deal with|处理
cope with|应对
be aware of|意识到
be likely to|很可能
be willing to|愿意
be able to|能够
be related to|与……有关
be different from|与……不同
be similar to|与……相似
be based on|以……为基础
be known for|因……而闻名
be famous for|因……而著名
be interested in|对……感兴趣
be satisfied with|对……满意
be concerned about|担心；关注
be involved in|参与；卷入
be exposed to|接触到
be used to doing|习惯于做
used to do|过去常常做
make use of|利用
take advantage of|利用
pay attention to|注意
attach importance to|重视
keep in mind|牢记
take into account|把……考虑在内
take measures to|采取措施
make an effort to|努力做
spend time doing|花时间做
have access to|有机会使用
have difficulty doing|做某事有困难
have an impact on|对……有影响
have a positive effect on|对……有积极影响
have no choice but to|别无选择只能
in addition to|除……之外
in terms of|就……而言
in order to|为了
in response to|回应
in contrast to|与……相比
in spite of|尽管
in favor of|支持
in the long run|从长远来看
in particular|尤其
in general|总体而言
in fact|事实上
in other words|换句话说
as a result|因此
as well as|以及
as long as|只要
as soon as|一……就
according to|根据
because of|由于
due to|由于
thanks to|由于；多亏
instead of|而不是
rather than|而不是
apart from|除……以外
regardless of|不管
with the help of|在……帮助下
on the one hand|一方面
on the other hand|另一方面
at the same time|同时
at least|至少
at first|起初
at present|目前
at risk|处于风险中
at a time|每次
for example|例如
for instance|例如
for the purpose of|为了
for the sake of|为了……起见
from time to time|有时
by means of|借助
by accident|偶然
by contrast|相比之下
by the end of|到……结束时
to some extent|在某种程度上
to a large extent|在很大程度上
to make matters worse|更糟的是
take place|发生
take action|采取行动
take notes|记笔记
take a break|休息一下
take care of|照顾；处理
make progress|取得进步
make a decision|作决定
make a contribution to|为……作贡献
make sure|确保
make sense|有意义；讲得通
reach a conclusion|得出结论
reach an agreement|达成协议
solve a problem|解决问题
raise awareness|提高意识
meet a need|满足需要
meet a requirement|满足要求
gain experience|获得经验
gain knowledge|获得知识
gain confidence|获得信心
improve efficiency|提高效率
improve quality|提高质量
reduce pressure|减轻压力
reduce costs|降低成本
increase the chance of|增加……的机会
increase awareness of|提高对……的认识
achieve a goal|实现目标
achieve success|取得成功
develop a habit|养成习惯
develop skills|培养技能
build confidence|建立信心
build a relationship|建立关系
offer an opportunity|提供机会
create value|创造价值
protect the environment|保护环境
save energy|节约能源
keep a balance|保持平衡`.split('\n').map((line, index) => { const [phrase, meaningZh] = line.split('|'); return { id: `c${String(index + 1).padStart(3, '0')}`, phrase, meaningZh, example: `Use “${phrase}” to express this idea clearly in CET-4 writing or translation.` }; });

const grammarNames = ['词性判断', '一般时态与完成时态', '被动语态', '主谓一致', '非谓语动词', '定语从句', '名词性从句', '状语从句', '比较结构', '虚拟语气', '倒装结构', '强调结构', '并列与平行结构', '代词指代', '长难句主干分析'];
const grammarTopics = grammarNames.map((title, index) => ({ id: `g${String(index + 1).padStart(2, '0')}`, title, summary: `掌握${title}的核心规则，并通过四级语境中的短句进行判断。`, checklist: ['先找句子主干', '识别连接词和修饰成分', '检查形式与语义是否一致'] }));

const themes = [
  ['校园志愿活动', 'campus volunteering'], ['图书馆服务', 'library services'], ['课程选择', 'course selection'], ['宿舍生活', 'dormitory life'],
  ['学生社团', 'student clubs'], ['实习安排', 'internship arrangements'], ['城市交通', 'urban transport'], ['环境保护', 'environmental protection'],
  ['健康饮食', 'healthy eating'], ['运动习惯', 'exercise habits'], ['数字学习', 'digital learning'], ['时间管理', 'time management'],
  ['社区服务', 'community service'], ['旅游计划', 'travel planning'], ['文化节日', 'cultural festivals'], ['科技创新', 'technological innovation'],
  ['就业准备', 'career preparation'], ['团队合作', 'teamwork'], ['公共安全', 'public safety'], ['消费选择', 'consumer choices'],
  ['气候变化', 'climate change'], ['博物馆活动', 'museum activities'], ['学术讲座', 'academic lectures'], ['在线会议', 'online meetings'],
] as const;
const listeningSets = themes.map(([theme, themeEn], index) => ({ id: `listen-${String(index + 1).padStart(2, '0')}`, type: index % 3 === 0 ? 'news' : index % 3 === 1 ? 'conversation' : 'passage', theme, themeEn, difficulty: index < 8 ? 'foundation' : index < 18 ? 'standard' : 'challenge', transcript: `A university program about ${themeEn} has introduced a new weekly activity. The Saturday group is full, but another session is now available on Sunday afternoon. Students are advised to register early and bring the materials listed in the notice.`, segments: [{ start: 0, end: 7, text: `A university program about ${themeEn} has introduced a new weekly activity.` }, { start: 7, end: 15, text: 'The Saturday group is full, but another session is now available on Sunday afternoon.' }, { start: 15, end: 23, text: 'Students are advised to register early and bring the materials listed in the notice.' }], questions: [{ prompt: 'When is the additional session available?', options: ['Saturday morning', 'Sunday afternoon', 'Monday evening', 'Friday noon'], answer: 1, explanationZh: 'but 后说明新增场次在周日下午。' }], audioSrc: `/audio/v1/listen-${String(index + 1).padStart(2, '0')}.wav` }));

const readingThemes = [...themes.map(([theme]) => theme), '人工智能', '终身学习', '传统手工艺', '食品浪费', '心理健康', '阅读习惯'];
const readingSets = readingThemes.map((theme, index) => ({ id: `read-${String(index + 1).padStart(2, '0')}`, type: index % 3 === 0 ? 'cloze' : index % 3 === 1 ? 'matching' : 'reading', theme, difficulty: index < 10 ? 'foundation' : index < 22 ? 'standard' : 'challenge', passage: `${theme} has become an important topic among college students. A recent campus project showed that small, regular actions are often more effective than a single large event. Participants said clear goals and timely feedback helped them continue. The organizers therefore plan to provide practical guidance and invite more students to join.`, questions: [{ prompt: 'What helped participants continue?', options: ['Higher costs', 'Clear goals and feedback', 'Less communication', 'A shorter semester'], answer: 1, explanationZh: '第三句直接说明 clear goals and timely feedback 帮助参与者坚持。' }] }));

const translationThemes = ['志愿服务', '传统节日', '公共交通', '数字支付', '在线教育', '环境保护', '中国茶文化', '城市公园', '科技创新', '全民健身', '文化遗产', '乡村发展'];
const translationPrompts = [
  '许多大学生利用周末参加志愿服务。他们在帮助社区居民的同时，也提高了沟通能力，并更加理解社会责任。',
  '中国的传统节日往往与家庭团聚有关。如今，年轻人还会通过短视频介绍节日习俗，让更多外国朋友了解中国文化。',
  '近年来，不少城市不断改善公共交通。更方便的地铁和公交线路既缩短了通勤时间，也有助于减少空气污染。',
  '数字支付在中国日常生活中十分普遍。人们只需使用手机就能完成许多交易，但同时也应注意保护个人信息。',
  '在线教育使学习不再受到地点限制。只要能够合理安排时间，学生就可以按照自己的节奏反复学习重要内容。',
  '越来越多的人认识到环境保护需要长期行动。节约能源、减少一次性用品等小习惯也能产生积极影响。',
  '中国茶文化有着悠久历史。饮茶不仅是一种生活习惯，人们还常常借此与亲友交流并表达热情好客。',
  '城市公园为居民提供了接近自然的空间。清晨和傍晚，许多人会在那里散步、锻炼或暂时远离忙碌的生活。',
  '科技创新正在改变生产和生活方式。新技术能够提高效率，但只有被负责任地使用，才能真正造福社会。',
  '全民健身活动近年来受到广泛欢迎。定期运动不仅有益于身体健康，还能帮助人们缓解压力、保持积极心态。',
  '文化遗产记录着一个民族的历史和智慧。保护古建筑与传统技艺，需要政府、专家和普通公众共同参与。',
  '随着基础设施不断完善，乡村发展迎来了新的机会。电子商务帮助农民销售产品，也吸引一些年轻人返乡创业。',
];
const translationAnswers = [
  'Many college students take part in volunteer service on weekends. While helping community residents, they also improve their communication skills and gain a better understanding of social responsibility.',
  'Traditional Chinese festivals are often connected with family reunions. Today, young people also introduce festival customs through short videos, enabling more foreign friends to understand Chinese culture.',
  'In recent years, many cities have continued to improve public transport. More convenient metro and bus routes not only shorten commuting time but also help reduce air pollution.',
  'Digital payment is common in daily life in China. People can complete many transactions simply by using a mobile phone, but they should also pay attention to protecting personal information.',
  'Online education allows learning to take place anywhere. As long as students manage their time properly, they can review important material repeatedly at their own pace.',
  'More people are realizing that environmental protection requires long-term action. Small habits such as saving energy and reducing disposable products can also make a positive difference.',
  'Chinese tea culture has a long history. Drinking tea is not only a daily habit; people also use it to communicate with friends and relatives and to show hospitality.',
  'City parks provide residents with space close to nature. In the morning and evening, many people walk, exercise, or briefly escape from their busy lives there.',
  'Technological innovation is changing the way people live and work. New technology can improve efficiency, but it can truly benefit society only when used responsibly.',
  'Public fitness activities have become widely popular in recent years. Regular exercise benefits physical health and also helps people reduce stress and maintain a positive attitude.',
  'Cultural heritage records the history and wisdom of a nation. Protecting historic buildings and traditional skills requires the joint participation of governments, experts, and the public.',
  'As infrastructure continues to improve, rural development is gaining new opportunities. E-commerce helps farmers sell products and attracts some young people to return home and start businesses.',
];
const translations = translationThemes.map((theme, index) => ({ id: `trans-${String(index + 1).padStart(2, '0')}`, theme, prompt: translationPrompts[index], referenceAnswer: translationAnswers[index], rubric: ['信息完整准确', '句子衔接自然', '时态、语态和主谓一致正确'] }));
const writingTopics = ['daily reading', 'volunteer work', 'time management', 'healthy habits', 'online learning', 'teamwork', 'environmental action', 'campus activities', 'career planning', 'digital tools', 'public transport', 'cultural exchange'];
const writingInstructions = [
  'Your university is collecting suggestions for encouraging daily reading. Write an essay explaining why the habit matters and propose one workable activity.',
  'Write an essay for the campus newspaper describing what students can learn from volunteer work. Support your view with an example.',
  'Many students struggle to balance study and rest. Write an essay explaining how effective time management can help and recommend a practical method.',
  'Write an essay discussing one healthy habit that college students often overlook and explain how the university could encourage it.',
  'Online learning offers flexibility but also creates difficulties. Write an essay evaluating both sides and state how students should use it.',
  'A student club wants to improve teamwork. Write an essay identifying a common team problem and suggesting how members can solve it.',
  'Write an essay persuading students to take one realistic environmental action on campus and explain its possible impact.',
  'Your university plans to redesign campus activities. Write an essay describing which kind of activity deserves more support and why.',
  'Write an essay explaining why career planning should begin before graduation and identify the first step a student can take.',
  'Digital tools can either support or interrupt study. Write an essay explaining how students can use them more responsibly.',
  'Write an essay about one improvement you would make to public transport around your university and explain who would benefit.',
  'Your class will hold an international cultural exchange event. Write an essay proposing an activity and explaining how it promotes understanding.',
];
const writingPrompts = writingTopics.map((topic, index) => ({ id: `write-${String(index + 1).padStart(2, '0')}`, topic, prompt: `${writingInstructions[index]} Write 120–180 words.`, outline: ['State a clear position', 'Develop it with reasons or an example', 'End with a practical conclusion'], referenceOpening: `In my view, ${topic} deserves thoughtful attention because it can make a meaningful difference in college life.` }));
const mockExams = Array.from({ length: 6 }, (_, index) => ({ id: `mock-${index + 1}`, title: `阶段模拟卷 ${index + 1}`, listeningSetIds: listeningSets.slice(index * 4, index * 4 + 4).map((item) => item.id), readingSetIds: readingSets.slice(index * 5, index * 5 + 5).map((item) => item.id), translationId: translations[index * 2].id, writingId: writingPrompts[index * 2].id, timingMinutes: 125 }));

await mkdir(outputDir, { recursive: true });
const outputs = { vocabulary, collocations: phraseText, grammarTopics, listeningSets, readingSets, translations, writingPrompts, mockExams };
for (const [name, data] of Object.entries(outputs)) await writeFile(path.join(outputDir, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
await writeFile(path.join(outputDir, 'inventory.json'), `${JSON.stringify(outputs, null, 2)}\n`, 'utf8');
console.log(Object.fromEntries(Object.entries(outputs).map(([name, data]) => [name, data.length])));
