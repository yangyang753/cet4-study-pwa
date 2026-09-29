export interface ListeningCueVocabulary { id: string; word: string; meaningZh: string }
export interface ListeningCue { wordId: string; answer: string; lemma: string; meaningZh: string; sentence: string; segmentIndex: number }

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function buildListeningCues(
  segments: Array<{ text: string }>,
  vocabulary: ListeningCueVocabulary[],
  limit = 3,
): ListeningCue[] {
  const cues: ListeningCue[] = [];
  const used = new Set<string>();
  for (let segmentIndex = 0; segmentIndex < segments.length && cues.length < limit; segmentIndex += 1) {
    for (const item of vocabulary) {
      if (used.has(item.id) || item.word.length < 4) continue;
      const pattern = new RegExp(`\\b${escapeRegExp(item.word)}(?:s|es|ed|ing)?\\b`, 'i');
      const match = segments[segmentIndex].text.match(pattern);
      if (!match) continue;
      used.add(item.id);
      cues.push({
        wordId: item.id,
        answer: match[0].toLowerCase(),
        lemma: item.word,
        meaningZh: item.meaningZh,
        sentence: segments[segmentIndex].text.replace(pattern, '_____'),
        segmentIndex,
      });
      break;
    }
  }
  return cues;
}

export function checkListeningCue(response: string, answer: string) {
  return response.trim().toLowerCase() === answer.trim().toLowerCase();
}
