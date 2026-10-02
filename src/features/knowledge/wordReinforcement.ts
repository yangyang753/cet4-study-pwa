import type { VocabularyEntry } from '../../domain/content';
import { gradeStrictVocabularyAnswer, type StrictVocabularyGrade } from '../vocabulary/strictVocabularyCheck';

export type WordReinforcementKind = 'meaning' | 'spelling' | 'cloze';

export interface WordReinforcement {
  id: string;
  kind: WordReinforcementKind;
  word: VocabularyEntry;
  cloze: string;
}

function randomCloze(value: string, random: () => number) {
  const letters = [...value];
  const letterIndexes = letters.map((letter, index) => /[a-z]/i.test(letter) ? index : -1).filter((index) => index >= 0);
  const hiddenTarget = Math.max(1, Math.min(letterIndexes.length, Math.round(letterIndexes.length * (0.35 + random() * 0.3))));
  const maximumStart = Math.max(0, letterIndexes.length - hiddenTarget);
  const offset = Math.min(maximumStart, Math.floor(random() * (maximumStart + 1)));
  const hiddenStart = letterIndexes[offset];
  const hiddenEnd = letterIndexes[offset + hiddenTarget - 1];
  return letters.map((letter, index) => index >= hiddenStart && index <= hiddenEnd ? '_' : letter).join('');
}

export function buildWordReinforcement(word: VocabularyEntry, random: () => number = Math.random): WordReinforcement {
  const roll = random();
  const kind: WordReinforcementKind = roll < 1 / 3 ? 'meaning' : roll < 2 / 3 ? 'spelling' : 'cloze';
  return { id: `${word.id}:reinforcement:${kind}`, kind, word, cloze: randomCloze(word.word, random) };
}

export function gradeWordReinforcement(exercise: WordReinforcement, answer: { english: string; chinese: string }): StrictVocabularyGrade {
  const kind = exercise.kind === 'meaning' ? 'meaning' : 'spelling';
  return gradeStrictVocabularyAnswer({ id: exercise.id, kind, word: exercise.word, cloze: exercise.cloze }, answer);
}
