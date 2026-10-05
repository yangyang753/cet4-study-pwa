import type { VocabularyEntry } from '../../domain/content';

export type StrictVocabularyQuestionKind = 'spelling' | 'meaning';

export interface StrictVocabularyQuestion {
  id: string;
  kind: StrictVocabularyQuestionKind;
  word: VocabularyEntry;
  cloze: string;
}

export interface StrictVocabularyGrade {
  correct: boolean;
  spellingCorrect: boolean;
  missingMeanings: string[];
  unexpectedMeanings: string[];
  matchedMeaningCount: number;
  requiredMeaningCount: number;
  recognizedMeanings: string[];
  remainingMeanings: string[];
}

interface MeaningConcept {
  label: string;
  aliases: string[];
}

const equivalentMeaningGroups = [
  ['文章', '篇章', '短文'],
  ['段落', '段'],
  ['好处', '益处', '优势', '利益'],
  ['得到', '获得', '取得', '获取'],
  ['使', '让'],
  ['做', '制作', '制造'],
  ['赚得', '赚到', '挣得', '挣到'],
  ['产生', '生成', '形成'],
  ['问题', '疑问'],
  ['参加', '参与'],
  ['重要', '关键'],
  ['帮助', '协助'],
  ['改变', '变化'],
  ['开始', '起初'],
  ['结束', '终止'],
  ['选择', '挑选'],
  ['提高', '提升', '改善'],
  ['减少', '降低'],
  ['增加', '增多'],
  ['展示', '显示'],
  ['购买', '买'],
  ['需要', '需求'],
  ['喜欢', '喜爱', '爱好'],
  ['赞同', '同意', '认可'],
  ['像', '如同', '类似'],
] as const;

function normalizeEnglish(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeChinese(value: string) {
  return value.replace(/[^\u3400-\u9fff]/g, '');
}

export function requiredMeanings(word: VocabularyEntry) {
  const accepted = word.meaningZh
    .replace(/(?:^|(?<=[^a-z]))(?:n|v|vt|vi|a|ad|adj|adv|pron|num|art|prep|conj|aux|modal)\./gi, ';')
    .replace(/[\u005b【(（][^\u005d】)）]*[\u005d】)）]/g, '')
    .split(/[;；,，、/]/)
    .map((fragment) => fragment.replace(/^[^\u3400-\u9fff]+|[^\u3400-\u9fff]+$/g, '').trim())
    .filter((fragment, index, all) => fragment.length >= 1 && all.indexOf(fragment) === index);
  return accepted.length ? accepted : [normalizeChinese(word.meaningZh)].filter(Boolean);
}

function aliasesFor(meaning: string) {
  const normalized = normalizeChinese(meaning);
  const group = equivalentMeaningGroups.find((items) => items.some((item) => normalizeChinese(item) === normalized));
  return group ? [...group] : [normalized];
}

function requiredMeaningConcepts(word: VocabularyEntry): MeaningConcept[] {
  const groupedMeanings = word.meaningZh
    .replace(/(?:^|(?<=[^a-z]))(?:n|v|vt|vi|a|ad|adj|adv|pron|num|art|prep|conj|aux|modal)\./gi, ';')
    .split(/[;；]/)
    .map((group) => group.split(/[，,、/]/).map((item) => item.replace(/^[^\u3400-\u9fff]+|[^\u3400-\u9fff]+$/g, '').trim()).filter(Boolean))
    .filter((group) => group.length);
  const concepts: MeaningConcept[] = [];
  groupedMeanings.forEach((group) => {
    const aliases = [...new Set(group.flatMap((meaning) => aliasesFor(meaning)).map(normalizeChinese).filter(Boolean))];
    const meaning = group[0];
    const existing = concepts.find((concept) => concept.aliases.some((alias) => aliases.includes(alias)));
    if (existing) {
      existing.aliases = [...new Set([...existing.aliases, ...aliases])];
      return;
    }
    concepts.push({ label: meaning, aliases });
  });
  return concepts;
}

function splitSubmittedMeanings(value: string) {
  return value
    .replace(/[\u005b【(（][^\u005d】)）]*[\u005d】)）]/g, '')
    .split(/[;；,，、/]|(?:以及|或者|并且|和|或|及|并)/)
    .map(normalizeChinese)
    .filter(Boolean);
}

function fragmentMatchesAlias(fragment: string, alias: string) {
  if (!fragment || !alias) return false;
  if (alias.length === 1) return fragment === alias;
  return fragment === alias || fragment.includes(alias);
}

export function buildStrictVocabularyQuestions(words: VocabularyEntry[]): StrictVocabularyQuestion[] {
  const kinds: StrictVocabularyQuestionKind[] = ['spelling', 'meaning'];
  return words.map((word, index) => ({
    id: `${word.id}:strict`,
    kind: kinds[index % kinds.length],
    word,
    cloze: [...word.word].map((letter, letterIndex) => letterIndex % 2 === 0 ? letter : /[a-z]/i.test(letter) ? '_' : letter).join(''),
  }));
}

export function gradeStrictVocabularyAnswer(
  question: StrictVocabularyQuestion,
  answer: { english: string; chinese: string },
  knownWords: VocabularyEntry[] = [],
): StrictVocabularyGrade {
  const needsEnglish = question.kind !== 'meaning';
  const needsChinese = question.kind !== 'spelling';
  const spellingCorrect = !needsEnglish || normalizeEnglish(answer.english) === normalizeEnglish(question.word.word);
  const concepts = needsChinese ? requiredMeaningConcepts(question.word) : [];
  const submittedMeanings = needsChinese ? splitSubmittedMeanings(answer.chinese) : [];
  const recognizedConcepts = concepts.filter((concept) => submittedMeanings.some((fragment) => (
    concept.aliases.some((alias) => fragmentMatchesAlias(fragment, alias))
  )));
  const remainingMeanings = concepts.filter((concept) => !recognizedConcepts.includes(concept)).map((concept) => concept.label);
  const requiredMeaningCount = needsChinese ? Math.min(3, concepts.length) : 0;
  const matchedMeaningCount = recognizedConcepts.length;
  const meaningCorrect = !needsChinese || matchedMeaningCount >= requiredMeaningCount;
  const missingMeanings = meaningCorrect ? [] : remainingMeanings;
  // Keep unfamiliar fragments as diagnostic feedback, but never let them overturn a
  // threshold-passing answer: a learner may know a valid sense that this compact list omits.
  const otherConcepts = knownWords
    .filter((word) => word.id !== question.word.id)
    .flatMap(requiredMeaningConcepts);
  const unexpectedMeanings = submittedMeanings.filter((fragment) => {
    const belongsHere = concepts.some((concept) => concept.aliases.some((alias) => fragmentMatchesAlias(fragment, alias)));
    if (belongsHere) return false;
    return otherConcepts.some((concept) => concept.aliases.some((alias) => fragmentMatchesAlias(fragment, alias)));
  }).filter((fragment, index, all) => all.indexOf(fragment) === index);
  return {
    correct: spellingCorrect && meaningCorrect,
    spellingCorrect,
    missingMeanings,
    unexpectedMeanings,
    matchedMeaningCount,
    requiredMeaningCount,
    recognizedMeanings: recognizedConcepts.map((concept) => concept.label),
    remainingMeanings,
  };
}
