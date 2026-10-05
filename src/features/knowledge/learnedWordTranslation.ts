import type { VocabularyEntry } from '../../domain/content';

export type LearnedWordTranslationMode = 'single' | 'multi';

export interface LearnedWordTranslationTarget {
  wordId: string;
  word: string;
  acceptedForms: string[];
}

export interface LearnedWordTranslationExercise {
  id: string;
  mode: LearnedWordTranslationMode;
  theme: string;
  promptZh: string;
  referenceAnswer: string;
  targets: LearnedWordTranslationTarget[];
}

export interface LearnedWordTranslationGrade {
  correct: boolean;
  sentenceComplete: boolean;
  coveredWordIds: string[];
  missingWordIds: string[];
}

interface CultureTemplate {
  theme: string;
  promptZh: string;
  referenceAnswer: string;
  words: string[];
}

const cultureTemplates: CultureTemplate[] = [
  { theme: '中华文化', promptZh: '中国文化吸引了许多年轻人。', referenceAnswer: 'Chinese culture attracts many young people.', words: ['culture'] },
  { theme: '古城历史', promptZh: '这座城市有悠久的历史。', referenceAnswer: 'This city has a long history.', words: ['history'] },
  { theme: '文化遗产', promptZh: '我们应该保护古老建筑。', referenceAnswer: 'We should protect ancient buildings.', words: ['protect'] },
  { theme: '待客之道', promptZh: '在中国，人们常用茶招待客人。', referenceAnswer: 'In China, people often serve tea to guests.', words: ['serve'] },
  { theme: '中国饮食', promptZh: '中国食物在许多国家很受欢迎。', referenceAnswer: 'Chinese food is popular in many countries.', words: ['food'] },
  { theme: '文化与历史', promptZh: '中国文化有悠久的历史。', referenceAnswer: 'Chinese culture has a long history.', words: ['culture', 'history'] },
  { theme: '保护古迹', promptZh: '我们应该保护这座古老城市。', referenceAnswer: 'We should protect this ancient city.', words: ['protect', 'ancient'] },
  { theme: '待客之道', promptZh: '人们用茶招待客人。', referenceAnswer: 'People serve tea to their guests.', words: ['serve', 'guest'] },
  { theme: '家庭饮食', promptZh: '中国家庭常一起分享食物。', referenceAnswer: 'Chinese families often share food together.', words: ['family', 'food'] },
  { theme: '公共文化', promptZh: '公共图书馆为当地社区服务。', referenceAnswer: 'The public library serves the local community.', words: ['public', 'community'] },
  { theme: '城市文化', promptZh: '这座城市是这个国家的重要文化中心。', referenceAnswer: 'This city is an important cultural center of the country.', words: ['city', 'important', 'country'] },
];

const irregularForms: Record<string, string[]> = {
  be: ['am', 'is', 'are', 'was', 'were', 'been'],
  become: ['became', 'becomes', 'becoming'],
  bring: ['brought', 'brings', 'bringing'],
  build: ['built', 'builds', 'building'],
  come: ['came', 'comes', 'coming'],
  give: ['gave', 'given', 'gives', 'giving'],
  have: ['has', 'had', 'having'],
  make: ['made', 'makes', 'making'],
  write: ['wrote', 'written', 'writes', 'writing'],
};

function acceptedForms(word: string) {
  const value = word.toLowerCase();
  const forms = new Set([value, `${value}s`, `${value}es`, `${value}ed`, `${value}ing`, ...(irregularForms[value] ?? [])]);
  if (value.endsWith('y') && !/[aeiou]y$/.test(value)) forms.add(`${value.slice(0, -1)}ies`);
  if (value.endsWith('e')) {
    forms.add(`${value}d`);
    forms.add(`${value.slice(0, -1)}ing`);
  }
  return [...forms];
}

function targetFor(entry: VocabularyEntry): LearnedWordTranslationTarget {
  return { wordId: entry.id, word: entry.word.toLowerCase(), acceptedForms: acceptedForms(entry.word) };
}

function selectIndex(length: number, random: () => number) {
  return Math.min(length - 1, Math.max(0, Math.floor(random() * length)));
}

function fromTemplate(template: CultureTemplate, entriesByWord: Map<string, VocabularyEntry>, mode: LearnedWordTranslationMode): LearnedWordTranslationExercise {
  const targets = template.words.map((word) => targetFor(entriesByWord.get(word)!));
  return {
    id: `learned-translation:${mode}:${targets.map((target) => target.wordId).join('+')}:${template.theme}`,
    mode,
    theme: template.theme,
    promptZh: template.promptZh,
    referenceAnswer: template.referenceAnswer,
    targets,
  };
}

export function buildLearnedWordTranslation(
  learnedWords: VocabularyEntry[],
  mode: LearnedWordTranslationMode,
  random: () => number = Math.random,
): LearnedWordTranslationExercise | null {
  const unique = learnedWords.filter((entry, index, all) => all.findIndex((item) => item.id === entry.id) === index);
  if (!unique.length || (mode === 'multi' && unique.length < 2)) return null;
  const entriesByWord = new Map(unique.map((entry) => [entry.word.toLowerCase(), entry]));
  const candidates = cultureTemplates.filter((template) => {
    const sizeMatches = mode === 'single' ? template.words.length === 1 : template.words.length >= 2 && template.words.length <= 3;
    return sizeMatches && template.words.every((word) => entriesByWord.has(word));
  });
  if (candidates.length) return fromTemplate(candidates[selectIndex(candidates.length, random)], entriesByWord, mode);

  const start = selectIndex(unique.length, random);
  const selected = mode === 'single' ? [unique[start]] : [unique[start], unique[(start + 1) % unique.length]];
  const promptZh = selected.map((entry) => entry.exampleZh?.trim()).filter(Boolean).join(' ') || selected.map((entry) => `请用英文表达“${entry.meaningZh.split('；')[0]}”。`).join(' ');
  const referenceAnswer = selected.map((entry) => entry.example.trim()).filter(Boolean).join(' ');
  return {
    id: `learned-translation:${mode}:${selected.map((entry) => entry.id).join('+')}:review`,
    mode,
    theme: '已学词短句',
    promptZh,
    referenceAnswer,
    targets: selected.map(targetFor),
  };
}

function includesForm(answer: string, forms: string[]) {
  return forms.some((form) => new RegExp(`(^|[^a-z])${form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i').test(answer));
}

export function gradeLearnedWordTranslation(exercise: LearnedWordTranslationExercise, answer: string): LearnedWordTranslationGrade {
  const normalized = answer.trim().toLowerCase();
  const coveredWordIds = exercise.targets.filter((target) => includesForm(normalized, target.acceptedForms)).map((target) => target.wordId);
  const missingWordIds = exercise.targets.filter((target) => !coveredWordIds.includes(target.wordId)).map((target) => target.wordId);
  const tokenCount = normalized.match(/[a-z]+(?:'[a-z]+)?/g)?.length ?? 0;
  const sentenceComplete = tokenCount >= exercise.targets.length + 2;
  return { correct: sentenceComplete && missingWordIds.length === 0, sentenceComplete, coveredWordIds, missingWordIds };
}
