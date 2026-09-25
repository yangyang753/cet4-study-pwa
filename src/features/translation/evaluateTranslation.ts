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

export function evaluateTranslation(segments: TranslationSegment[], vocabulary: VocabularyEntry[]): TranslationEvaluation {
  const vocabularyByWord = new Map(vocabulary.map((entry) => [entry.word.toLowerCase(), entry]));
  const auditableWords: AuditedWord[] = [];
  const missedWords: AuditedWord[] = [];
  const seen = new Set<string>();

  for (const segment of segments) {
    for (const token of englishTokens(segment.text)) {
      const entry = vocabularyByWord.get(token);
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
      if (!covered) missedWords.push(audited);
    }
  }

  return {
    complete: segments.every((segment) => segment.translation.trim().length > 0),
    auditableWords,
    missedWords,
  };
}
