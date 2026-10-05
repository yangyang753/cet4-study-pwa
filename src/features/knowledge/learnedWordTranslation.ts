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
  meaningComplete: boolean;
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
  get: ['got', 'gotten', 'gets', 'getting'],
  have: ['has', 'had', 'having'],
  make: ['made', 'makes', 'making'],
  begin: ['began', 'begun', 'begins', 'beginning'],
  plan: ['plans', 'planned', 'planning'],
  put: ['puts', 'put', 'putting'],
  run: ['ran', 'runs', 'running'],
  sit: ['sat', 'sits', 'sitting'],
  stop: ['stops', 'stopped', 'stopping'],
  write: ['wrote', 'written', 'writes', 'writing'],
};

function acceptedForms(word: string) {
  const value = word.toLowerCase();
  const forms = new Set([value, ...(irregularForms[value] ?? [])]);
  if (value.endsWith('y') && !/[aeiou]y$/.test(value)) {
    forms.add(`${value.slice(0, -1)}ies`);
    forms.add(`${value.slice(0, -1)}ied`);
    forms.add(`${value}ing`);
  } else if (value.endsWith('e')) {
    forms.add(`${value}s`);
    forms.add(`${value}d`);
    forms.add(`${value.slice(0, -1)}ing`);
  } else {
    forms.add(`${value}${/(?:s|x|z|ch|sh|o)$/.test(value) ? 'es' : 's'}`);
    forms.add(`${value}ed`);
    forms.add(`${value}ing`);
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
  excludedExerciseIds: string[] = [],
): LearnedWordTranslationExercise | null {
  const unique = learnedWords.filter((entry, index, all) => all.findIndex((item) => item.id === entry.id) === index);
  if (!unique.length || (mode === 'multi' && unique.length < 2)) return null;
  const entriesByWord = new Map(unique.map((entry) => [entry.word.toLowerCase(), entry]));
  const candidates = cultureTemplates.filter((template) => {
    const sizeMatches = mode === 'single' ? template.words.length === 1 : template.words.length >= 2 && template.words.length <= 3;
    return sizeMatches && template.words.every((word) => entriesByWord.has(word));
  });
  if (candidates.length) {
    const available = candidates.filter((template) => !excludedExerciseIds.includes(fromTemplate(template, entriesByWord, mode).id));
    const pool = available.length ? available : candidates;
    return fromTemplate(pool[selectIndex(pool.length, random)], entriesByWord, mode);
  }

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

const semanticStopWords = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'by', 'for', 'from', 'has', 'have', 'had',
  'he', 'her', 'his', 'i', 'in', 'is', 'it', 'its', 'many', 'of', 'on', 'our', 'she', 'should', 'that', 'the',
  'their', 'them', 'they', 'this', 'those', 'to', 'us', 'was', 'we', 'were', 'will', 'with', 'you', 'your',
]);

function semanticRoot(token: string) {
  if (token.length > 5 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 5 && token.endsWith('ing')) return token.slice(0, -3).replace(/(.)\1$/, '$1');
  if (token.length > 4 && token.endsWith('ed')) return token.slice(0, -2).replace(/(.)\1$/, '$1');
  if (token.length > 4 && token.endsWith('es')) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

function semanticTokens(value: string) {
  return (value.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [])
    .map(semanticRoot)
    .filter((token) => token.length > 1 && !semanticStopWords.has(token));
}

export function gradeLearnedWordTranslation(exercise: LearnedWordTranslationExercise, answer: string): LearnedWordTranslationGrade {
  const normalized = answer.trim().toLowerCase();
  const coveredWordIds = exercise.targets.filter((target) => includesForm(normalized, target.acceptedForms)).map((target) => target.wordId);
  const missingWordIds = exercise.targets.filter((target) => !coveredWordIds.includes(target.wordId)).map((target) => target.wordId);
  const tokenCount = normalized.match(/[a-z]+(?:'[a-z]+)?/g)?.length ?? 0;
  const sentenceComplete = tokenCount >= exercise.targets.length + 2;
  const targetForms = new Set(exercise.targets.flatMap((target) => target.acceptedForms.map(semanticRoot)));
  const referenceTokens = [...new Set(semanticTokens(exercise.referenceAnswer).filter((token) => !targetForms.has(token)))];
  const answerTokens = new Set(semanticTokens(normalized));
  const matchedReferenceTokens = referenceTokens.filter((token) => answerTokens.has(token));
  const requiredReferenceTokens = Math.min(3, Math.max(1, Math.ceil(referenceTokens.length * 0.6)));
  const meaningComplete = referenceTokens.length === 0 || matchedReferenceTokens.length >= requiredReferenceTokens;
  return {
    correct: sentenceComplete && meaningComplete && missingWordIds.length === 0,
    sentenceComplete,
    meaningComplete,
    coveredWordIds,
    missingWordIds,
  };
}
