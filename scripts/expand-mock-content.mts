import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const contentDir = path.join(process.cwd(), 'content/v1');
const readJson = async <T>(name: string): Promise<T> => JSON.parse(await readFile(path.join(contentDir, name), 'utf8')) as T;
const writeJson = async (name: string, value: unknown) => writeFile(path.join(contentDir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');

type SetItem = { id: string; theme: string; themeEn?: string; type: string; difficulty: string; audioSrc?: string };

const listeningSets = (await readJson<SetItem[]>('listeningSets.json')).map((set, index) => {
  const themeEn = set.themeEn ?? set.theme;
  const transcript = `A university program about ${themeEn} has introduced a new weekly activity after reviewing student feedback. The Saturday group is full, but another session is now available on Sunday afternoon. Students should register online before Thursday and bring a student card and a reusable notebook. No previous experience is required because a short orientation will be provided. Anyone unable to attend may watch a recording later.`;
  const questions = [
    { prompt: 'When is the additional session available?', options: ['Saturday morning', 'Sunday afternoon', 'Monday evening', 'Friday noon'], answer: 1, explanationZh: '转折后明确说明新增场次在周日下午。' },
    { prompt: 'Why was another session added?', options: ['The teacher was absent', 'The Saturday group was full', 'The room was repaired', 'The fee was reduced'], answer: 1, explanationZh: 'but 前后说明周六组已满，因此增加了另一场。' },
    { prompt: 'What is the announcement mainly about?', options: [`A new ${themeEn} activity`, 'A cancelled examination', 'A library fine', 'A sports competition'], answer: 0, explanationZh: `开头说明学校推出了与 ${set.theme} 有关的新活动。` },
    { prompt: 'When should students register?', options: ['Before Thursday', 'On Friday night', 'After Sunday', 'At the end of term'], answer: 0, explanationZh: '原文要求学生在周四之前在线注册。' },
    { prompt: 'What should students bring?', options: ['A laptop and headphones', 'A passport and map', 'A student card and reusable notebook', 'Food and sportswear'], answer: 2, explanationZh: '原文列出的材料是学生证和可重复使用的笔记本。' },
    { prompt: 'What is said about previous experience?', options: ['It is required', 'It is preferred', 'It is not required', 'It must be certified'], answer: 2, explanationZh: '原文明确说不要求先前经验，并会提供简短说明。' },
    { prompt: 'What can students do if they cannot attend?', options: ['Request a refund', 'Watch a recording later', 'Join without registering', 'Submit a written report'], answer: 1, explanationZh: '结尾指出不能参加者之后可以观看录像。' },
  ].slice(0, index % 4 === 0 ? 7 : 6);
  return {
    ...set,
    transcript,
    segments: [
      { start: 0, end: 9, text: `A university program about ${themeEn} has introduced a new weekly activity after reviewing student feedback.` },
      { start: 9, end: 18, text: 'The Saturday group is full, but another session is now available on Sunday afternoon.' },
      { start: 18, end: 28, text: 'Students should register online before Thursday and bring a student card and a reusable notebook.' },
      { start: 28, end: 37, text: 'No previous experience is required because a short orientation will be provided.' },
      { start: 37, end: 44, text: 'Anyone unable to attend may watch a recording later.' },
    ],
    questions,
  };
});

const readingSets = (await readJson<SetItem[]>('readingSets.json')).map((set) => ({
  ...set,
  passage: `${set.theme} has become an important topic among college students. A student group recently ran an eight-week pilot project involving 120 participants. The project showed that small, regular actions were more effective than a single large event. Participants said clear goals and timely feedback helped them continue, although lack of time remained the most common difficulty. In response, the organizers shortened the weekly tasks and provided practical guidance. In the final survey, three quarters of the participants said they intended to continue, so the organizers plan to invite more students next term.`,
  questions: [
    { prompt: 'What is the passage mainly about?', options: [`A student project concerning ${set.theme}`, 'A change to examination rules', 'A commercial advertising campaign', 'A dispute between teachers'], answer: 0, explanationZh: `全文围绕学生开展的${set.theme}项目、效果和改进展开。` },
    { prompt: 'How long did the pilot project last?', options: ['Two weeks', 'Four weeks', 'Eight weeks', 'One year'], answer: 2, explanationZh: '第二句说明试点项目持续八周。' },
    { prompt: 'How many people took part in the project?', options: ['30', '75', '100', '120'], answer: 3, explanationZh: '第二句给出的参与人数是 120 人。' },
    { prompt: 'What helped participants continue?', options: ['Higher costs', 'Clear goals and timely feedback', 'Less communication', 'Longer tasks'], answer: 1, explanationZh: '第四句直接说明清晰目标和及时反馈帮助参与者坚持。' },
    { prompt: 'What was the most common difficulty?', options: ['Lack of time', 'Lack of equipment', 'Poor weather', 'High fees'], answer: 0, explanationZh: 'although 后指出最常见的困难是缺少时间。' },
    { prompt: 'How did the organizers respond to the difficulty?', options: ['They cancelled the project', 'They charged an extra fee', 'They shortened tasks and offered guidance', 'They reduced the number of participants'], answer: 2, explanationZh: '组织者缩短每周任务并提供实用指导。' },
  ],
}));

await writeJson('listeningSets.json', listeningSets);
await writeJson('readingSets.json', readingSets);

const inventory = await readJson<Record<string, unknown>>('inventory.json');
inventory.listeningSets = listeningSets;
inventory.readingSets = readingSets;
await writeJson('inventory.json', inventory);

console.log({ listeningQuestions: listeningSets.reduce((sum, set) => sum + set.questions.length, 0), readingQuestions: readingSets.reduce((sum, set) => sum + set.questions.length, 0) });
