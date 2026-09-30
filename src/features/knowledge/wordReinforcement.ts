import type { VocabularyEntry } from '../../domain/content';
import { gradeStrictVocabularyAnswer, type StrictVocabularyGrade } from '../vocabulary/strictVocabularyCheck';

export type WordReinforcementKind = 'meaning' | 'spelling' | 'cloze' | 'dual';

export interface WordReinforcement {
  id: string;
  kind: WordReinforcementKind;
  word: VocabularyEntry;
  cloze: string;
}

function randomCloze(value: string, random: () => number) {
  const letters = [...value];
  const letterIndexes = letters.map((letter, index) => /[a-z]/i.test(letter) ? index : -1).filter((index) => index >= 0);
  const hiddenTarget = Math.max(1, Math.min(letterIndexes.length, Math.round(letterIndexes.length * (0.35 + random() * 0.45))));
  const offset = Math.floor(random() * Math.max(1, letterIndexes.length));
  const hidden = new Set(Array.from({ length: hiddenTarget }, (_, index) => letterIndexes[(offset + index * 2) % letterIndexes.length]));
  return letters.map((letter, index) => hidden.has(index) ? '_' : letter).join('');
}

export function buildWordReinforcement(word: VocabularyEntry, random: () => number = Math.random): WordReinforcement {
  const roll = random();
  const kind: WordReinforcementKind = roll < 0.25 ? 'meaning' : roll < 0.5 ? 'spelling' : roll < 0.8 ? 'cloze' : 'dual';
  return { id: `${word.id}:reinforcement:${kind}`, kind, word, cloze: randomCloze(word.word, random) };
}

export function gradeWordReinforcement(exercise: WordReinforcement, answer: { english: string; chinese: string }): StrictVocabularyGrade {
  const kind = exercise.kind === 'meaning' ? 'meaning' : exercise.kind === 'spelling' || exercise.kind === 'cloze' ? 'spelling' : 'dual';
  return gradeStrictVocabularyAnswer({ id: exercise.id, kind, word: exercise.word, cloze: exercise.cloze }, answer);
}
