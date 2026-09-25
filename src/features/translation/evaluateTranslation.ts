import type { VocabularyEntry } from '../../domain/content';

export interface TranslationSegment {
  id: string;
  text: string;
  translation: string;
}

export interface AuditedWord extends VocabularyEntry {
  segmentId: string;
  acceptedMeanings: string[];
}

export interface TranslationEvaluation {
  complete: boolean;
  auditableWords: AuditedWord[];
  coveredWords: AuditedWord[];
  missedWords: AuditedWord[];
}

const partOfSpeech = /(?:^|(?<=[^a-z]))(?:n|v|vt|vi|a|ad|adj|adv|pron|num|art|prep|conj|aux|modal)\./gi;

export function acceptedChineseMeanings(meaning: string): string[] {
  return meaning
    .replace(partOfSpeech, ';')
    .replace(/[\u005b【(（][^\u005d】)）]*[\u005d】)）]/g, '')
    .split(/[;；,，、/]/)
    .map((fragment) => fragment.replace(/^[^\u3400-\u9fff]+|[^\u3400-\u9fff]+$/g, '').trim())
    .filter((fragment, index, all) => fragment.length >= 2 && all.indexOf(fragment) === index);
}

function englishTokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g)?.map((token) => token.replace(/'s$/, '')) ?? [];
}

function wordCandidates(token: string): string[] {
  const candidates = [token];
  const add = (candidate: string) => { if (candidate.length >= 2 && !candidates.includes(candidate)) candidates.push(candidate); };
  if (token.endsWith('ies')) add(`${token.slice(0, -3)}y`);
  if (token.endsWith('ied')) add(`${token.slice(0, -3)}y`);
  if (token.endsWith('es')) add(token.slice(0, -2));
  if (token.endsWith('s')) add(token.slice(0, -1));
  if (token.endsWith('ed')) { add(token.slice(0, -2)); add(token.slice(0, -1)); }
  if (token.endsWith('ing')) {
    const stem = token.slice(0, -3);
    add(stem);
    add(`${stem}e`);
    if (stem.length > 2 && stem.at(-1) === stem.at(-2)) add(stem.slice(0, -1));
  }
  if (token.endsWith('er')) {
    const stem = token.slice(0, -2);
    add(stem);
    add(token.slice(0, -1));
    if (stem.length > 2 && stem.at(-1) === stem.at(-2)) add(stem.slice(0, -1));
  }
  if (token.endsWith('est')) {
    const stem = token.slice(0, -3);
    add(stem);
    add(token.slice(0, -2));
    if (stem.length > 2 && stem.at(-1) === stem.at(-2)) add(stem.slice(0, -1));
  }
  return candidates;
}

export function resolveVocabularyToken(token: string, vocabulary: VocabularyEntry[]): VocabularyEntry | null {
  const vocabularyByWord = new Map(vocabulary.map((entry) => [entry.word.toLowerCase(), entry]));
  return wordCandidates(token.toLowerCase()).map((candidate) => vocabularyByWord.get(candidate)).find(Boolean) ?? null;
}

export function evaluateTranslation(segments: TranslationSegment[], vocabulary: VocabularyEntry[]): TranslationEvaluation {
  const vocabularyByWord = new Map(vocabulary.map((entry) => [entry.word.toLowerCase(), entry]));
  const auditableWords: AuditedWord[] = [];
  const coveredWords: AuditedWord[] = [];
  const missedWords: AuditedWord[] = [];
  const seen = new Set<string>();

  for (const segment of segments) {
    for (const token of englishTokens(segment.text)) {
      const entry = wordCandidates(token).map((candidate) => vocabularyByWord.get(candidate)).find(Boolean);
      if (!entry) continue;
      const acceptedMeanings = acceptedChineseMeanings(entry.meaningZh);
      if (acceptedMeanings.length === 0) continue;
      const key = `${segment.id}:${entry.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const audited = { ...entry, segmentId: segment.id, acceptedMeanings };
      auditableWords.push(audited);
      const covered = acceptedMeanings.some((meaning) => {
        if (segment.translation.includes(meaning)) return true;
        const withoutParticle = meaning.endsWith('的') ? meaning.slice(0, -1) : meaning;
        return withoutParticle.length >= 2 && segment.translation.includes(withoutParticle);
      });
      if (covered) coveredWords.push(audited);
      else missedWords.push(audited);
    }
  }

  return {
    complete: segments.every((segment) => /[\u3400-\u9fff]/.test(segment.translation)),
    auditableWords,
    coveredWords,
    missedWords,
  };
}
