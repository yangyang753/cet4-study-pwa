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
  qualityIssues: Array<{ segmentId: string; reason: string }>;
}

const partOfSpeech = /(?:^|(?<=[^a-z]))(?:n|v|vt|vi|a|ad|adj|adv|pron|num|art|prep|conj|aux|modal)\./gi;

const meaningAliases: Record<string, string[]> = {
  activity: ['活动'],
  available: ['可以', '可用', '有空'],
  large: ['大的', '较大', '宽敞'],
  one: ['一个', '一项', '一位'],
  study: ['学习', '研究'],
  use: ['使用', '利用', '采用'],
};

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
  const qualityIssues: Array<{ segmentId: string; reason: string }> = [];

  for (const segment of segments) {
    for (const token of englishTokens(segment.text)) {
      const entry = wordCandidates(token).map((candidate) => vocabularyByWord.get(candidate)).find(Boolean);
      if (!entry) continue;
      const acceptedMeanings = [...new Set([
        ...acceptedChineseMeanings(entry.meaningZh),
        ...(meaningAliases[entry.word.toLowerCase()] ?? []),
      ])];
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

  for (const segment of segments) {
    const chinese = segment.translation.match(/[\u3400-\u9fff]/g)?.join('') ?? '';
    const tokenCount = englishTokens(segment.text).length;
    const minimumLength = Math.max(2, Math.min(6, Math.ceil(tokenCount * 0.75)));
    const cues: Array<[RegExp, RegExp, string]> = [
      [/\bwhen\b/i, /什么时候|何时|哪天|时间/, '时间疑问信息'],
      [/\bwhy\b/i, /为什么|为何|原因/, '原因疑问信息'],
      [/\bhow\b/i, /如何|怎么|怎样/, '方式疑问信息'],
      [/\bwhat\b/i, /什么|哪一|哪种/, '内容疑问信息'],
      [/\bsunday\b/i, /星期日|星期天|周日|礼拜日/, '星期日'],
      [/\bmonday\b/i, /星期一|周一|礼拜一/, '星期一'],
      [/\bafternoon\b/i, /下午/, '下午'],
      [/\bmorning\b/i, /早上|上午|清晨/, '上午'],
      [/\bevening\b/i, /晚上|傍晚/, '晚上'],
    ];
    const missingCue = cues.find(([english, chineseCue]) => english.test(segment.text) && !chineseCue.test(segment.translation));
    if (chinese.length < minimumLength) qualityIssues.push({ segmentId: segment.id, reason: `中文信息过短，至少需要约 ${minimumLength} 个有效汉字` });
    else if (/^([\u3400-\u9fff]{1,4})\1{2,}$/.test(chinese)) qualityIssues.push({ segmentId: segment.id, reason: '存在重复占位内容' });
    else if (missingCue) qualityIssues.push({ segmentId: segment.id, reason: `缺少${missingCue[2]}` });
  }

  return {
    complete: qualityIssues.length === 0,
    auditableWords,
    coveredWords,
    missedWords,
    qualityIssues,
  };
}
