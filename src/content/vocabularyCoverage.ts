import type { VocabularyEntry } from '../domain/content';

interface VocabularyCoverageOptions {
  minimumOccurrences?: number;
  ignoreWords?: string[];
}

interface PracticeQuestionText { prompt?: string; options?: string[]; [key: string]: unknown }
interface PracticeVocabularyCorpus {
  listeningSets?: Array<{ themeEn?: string; transcript?: string; questions?: PracticeQuestionText[]; [key: string]: unknown }>;
  readingSets?: Array<{ passage?: string; questions?: PracticeQuestionText[]; [key: string]: unknown }>;
  translations?: Array<{ referenceAnswer?: string; [key: string]: unknown }>;
  writingPrompts?: Array<{ prompt?: string; outline?: string[]; referenceAnswer?: string; [key: string]: unknown }>;
}

function learnerFacingText(corpus: PracticeVocabularyCorpus) {
  const output: string[] = [];
  const add = (value?: string) => { if (value?.trim()) output.push(value); };
  const addQuestion = (question: PracticeQuestionText) => {
    add(question.prompt);
    question.options?.forEach(add);
  };
  corpus.listeningSets?.forEach((set) => {
    add(set.themeEn);
    add(set.transcript);
    set.questions?.forEach(addQuestion);
  });
  corpus.readingSets?.forEach((set) => {
    add(set.passage);
    set.questions?.forEach(addQuestion);
  });
  corpus.translations?.forEach((item) => add(item.referenceAnswer));
  corpus.writingPrompts?.forEach((item) => {
    add(item.prompt);
    item.outline?.forEach(add);
    add(item.referenceAnswer);
  });
  return output;
}

function commonForms(source: string) {
  const word = source.toLocaleLowerCase().trim();
  if (!/^[a-z]+$/.test(word)) return [word];
  const forms = new Set([word]);
  if (/[^aeiou]y$/.test(word)) {
    forms.add(`${word.slice(0, -1)}ies`);
    forms.add(`${word.slice(0, -1)}ied`);
    forms.add(`${word.slice(0, -1)}ier`);
    forms.add(`${word.slice(0, -1)}iest`);
  } else {
    forms.add(/(?:s|x|z|ch|sh)$/.test(word) ? `${word}es` : `${word}s`);
    forms.add(word.endsWith('e') ? `${word}d` : `${word}ed`);
  }
  forms.add(word.endsWith('e') && !word.endsWith('ee') ? `${word.slice(0, -1)}ing` : `${word}ing`);
  const agent = word.endsWith('e') ? `${word}r` : `${word}er`;
  forms.add(agent);
  forms.add(`${agent}s`);
  const presentParticiple = word.endsWith('e') && !word.endsWith('ee') ? `${word.slice(0, -1)}ing` : `${word}ing`;
  forms.add(presentParticiple);
  forms.add(`${presentParticiple}s`);
  if (['begin', 'plan', 'prefer', 'run', 'stop', 'submit'].includes(word)) {
    const doubled = `${word}${word.at(-1)}`;
    forms.add(`${doubled}ing`);
    forms.add(`${doubled}ed`);
    forms.add(`${doubled}er`);
    forms.add(`${doubled}ers`);
  }
  if (word.length > 3) {
    forms.add(word.endsWith('e') ? `${word}r` : `${word}er`);
    forms.add(word.endsWith('e') ? `${word}st` : `${word}est`);
  }
  return [...forms];
}

function catalogForms(entries: VocabularyEntry[]) {
  const forms = new Set<string>();
  for (const entry of entries) {
    for (const source of [entry.word, ...entry.derivatives]) {
      commonForms(source).forEach((form) => forms.add(form));
    }
  }
  const commonIrregulars: Record<string, string[]> = {
    become: ['became'],
    begin: ['began', 'begun', 'beginner', 'beginners'],
    can: ['cannot'],
    find: ['found', 'finding', 'findings'],
    make: ['made'],
    say: ['said'],
    show: ['shown'],
    spend: ['spent'],
    take: ['took', 'taken'],
  };
  for (const [word, irregulars] of Object.entries(commonIrregulars)) {
    if (forms.has(word)) irregulars.forEach((form) => forms.add(form));
  }
  const commonDerivatives: Record<string, string[]> = {
    academy: ['academic'],
    adjust: ['adjustment', 'adjustments'],
    apply: ['application', 'applications'],
    clear: ['unclear'],
    culture: ['cultural'],
    describe: ['description', 'descriptions'],
    environment: ['environmental'],
    expect: ['expectation', 'expectations'],
    improve: ['improvement', 'improvements'],
    introduce: ['introduction', 'introductions'],
    necessary: ['unnecessary'],
    reside: ['resident', 'residents'],
    suggest: ['suggestion', 'suggestions'],
  };
  for (const [word, derivatives] of Object.entries(commonDerivatives)) {
    if (forms.has(word)) derivatives.forEach((form) => forms.add(form));
  }
  return forms;
}

export function auditPracticeVocabularyCoverage(
  corpus: PracticeVocabularyCorpus,
  entries: VocabularyEntry[],
  options: VocabularyCoverageOptions = {},
): string[] {
  const minimumOccurrences = options.minimumOccurrences ?? 20;
  const ignored = new Set((options.ignoreWords ?? []).map((word) => word.toLocaleLowerCase()));
  const known = catalogForms(entries);
  const strings = learnerFacingText(corpus);
  const counts = new Map<string, number>();
  for (const source of strings) {
    for (const token of source.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) ?? []) {
      const word = token.toLocaleLowerCase().replaceAll('’', "'").replace(/'s$/, '');
      if (word.length === 1 && word !== 'a' && word !== 'i') continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([word, count]) => count >= minimumOccurrences && !known.has(word) && !ignored.has(word))
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([word, count]) => `practice vocabulary: ${word} appears ${count} times but is missing from study catalogs`);
}
