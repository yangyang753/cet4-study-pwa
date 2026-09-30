import type { VocabularyEntry } from '../../domain/content';

export type StrictVocabularyQuestionKind = 'spelling' | 'meaning' | 'dual';

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
}

function normalizeEnglish(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeChinese(value: string) {
  return value.replace(/[^\u3400-\u9fff]/g, '');
}

function requiredMeanings(word: VocabularyEntry) {
  const accepted = word.meaningZh
    .replace(/(?:^|(?<=[^a-z]))(?:n|v|vt|vi|a|ad|adj|adv|pron|num|art|prep|conj|aux|modal)\./gi, ';')
    .replace(/[\u005b【(（][^\u005d】)）]*[\u005d】)）]/g, '')
    .split(/[;；,，、/]/)
    .map((fragment) => fragment.replace(/^[^\u3400-\u9fff]+|[^\u3400-\u9fff]+$/g, '').trim())
    .filter((fragment, index, all) => fragment.length >= 1 && all.indexOf(fragment) === index);
  return accepted.length ? accepted : [normalizeChinese(word.meaningZh)].filter(Boolean);
}

export function buildStrictVocabularyQuestions(words: VocabularyEntry[]): StrictVocabularyQuestion[] {
  const kinds: StrictVocabularyQuestionKind[] = ['spelling', 'meaning', 'dual'];
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
): StrictVocabularyGrade {
  const needsEnglish = question.kind !== 'meaning';
  const needsChinese = question.kind !== 'spelling';
  const spellingCorrect = !needsEnglish || normalizeEnglish(answer.english) === normalizeEnglish(question.word.word);
  const submittedChinese = normalizeChinese(answer.chinese);
  const missingMeanings = needsChinese
    ? requiredMeanings(question.word).filter((meaning) => !submittedChinese.includes(normalizeChinese(meaning)))
    : [];
  return { correct: spellingCorrect && missingMeanings.length === 0, spellingCorrect, missingMeanings };
}
