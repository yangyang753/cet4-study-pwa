export interface ContentInventory {
  vocabulary: unknown[];
  collocations: unknown[];
  grammarTopics: unknown[];
  listeningSets: unknown[];
  readingSets: unknown[];
  translations: unknown[];
  writingPrompts: unknown[];
  mockExams: unknown[];
}

interface MockCandidate {
  id?: string;
  listeningSetIds?: string[];
  readingSetIds?: string[];
  translationId?: string;
  writingId?: string;
  timingMinutes?: number;
}

interface QuestionSetCandidate { id?: string; questions?: unknown[] }

interface DiversityQuestionCandidate { prompt?: string; answer?: number }
interface ListeningDiversityCandidate extends QuestionSetCandidate { theme?: string; themeEn?: string; transcript?: string; audioSrc?: string; questions?: DiversityQuestionCandidate[] }
interface ReadingDiversityCandidate extends QuestionSetCandidate { theme?: string; passage?: string; questions?: DiversityQuestionCandidate[] }
interface SubjectiveDiversityCandidate { id?: string; theme?: string; topic?: string; prompt?: string }
interface DiversityInventory {
  listeningSets: ListeningDiversityCandidate[];
  readingSets: ReadingDiversityCandidate[];
  translations: SubjectiveDiversityCandidate[];
  writingPrompts: SubjectiveDiversityCandidate[];
}

const minimums: Record<keyof ContentInventory, number> = { vocabulary: 800, collocations: 120, grammarTopics: 15, listeningSets: 24, readingSets: 30, translations: 12, writingPrompts: 12, mockExams: 6 };

export function auditContentInventory(inventory: ContentInventory): string[] {
  const errors: string[] = [];
  for (const [key, minimum] of Object.entries(minimums) as [keyof ContentInventory, number][]) {
    if (inventory[key].length < minimum) errors.push(`${key}: expected at least ${minimum}, received ${inventory[key].length}`);
    const ids = inventory[key].map((item) => typeof item === 'object' && item && 'id' in item ? String(item.id) : '');
    const seen = new Set<string>();
    ids.forEach((id) => { if (seen.has(id)) errors.push(`${key}: duplicate id ${id}`); seen.add(id); });
  }

  const listeningCounts = new Map((inventory.listeningSets as QuestionSetCandidate[]).map((set) => [set.id, set.questions?.length ?? 0]));
  const readingCounts = new Map((inventory.readingSets as QuestionSetCandidate[]).map((set) => [set.id, set.questions?.length ?? 0]));
  for (const mock of inventory.mockExams as MockCandidate[]) {
    if (!mock.id || !mock.listeningSetIds || !mock.readingSetIds) continue;
    const listeningCount = mock.listeningSetIds.reduce((total, id) => total + (listeningCounts.get(id) ?? 0), 0);
    const readingCount = mock.readingSetIds.reduce((total, id) => total + (readingCounts.get(id) ?? 0), 0);
    const total = 2 + listeningCount + readingCount;
    if (listeningCount !== 25) errors.push(`${mock.id}: expected 25 listening questions, received ${listeningCount}`);
    if (readingCount !== 30) errors.push(`${mock.id}: expected 30 reading questions, received ${readingCount}`);
    if (total !== 57) errors.push(`${mock.id}: expected 57 total questions, received ${total}`);
    if (mock.timingMinutes !== 125) errors.push(`${mock.id}: expected 125 minutes, received ${mock.timingMinutes}`);
    if (!mock.translationId) errors.push(`${mock.id}: missing translation reference`);
    if (!mock.writingId) errors.push(`${mock.id}: missing writing reference`);
  }
  return errors;
}

interface GeneratedQuestionCandidate {
  id: string;
  options?: { id: string; text: string }[];
  correctAnswer?: string | string[];
}

export function auditGeneratedQuestions(groups: Partial<Record<'vocabulary' | 'grammar', GeneratedQuestionCandidate[]>>): string[] {
  const errors: string[] = [];
  for (const [kind, questions] of Object.entries(groups)) {
    if (!questions) continue;
    for (const question of questions) {
      if (!question.options) continue;
      const normalized = question.options.map((option) => option.text.trim().toLocaleLowerCase());
      if (new Set(normalized).size !== normalized.length) errors.push(`${kind}:${question.id}: duplicate option text`);
    }
    if (questions.length >= 4) {
      const positions = new Set(questions.slice(0, 8).flatMap((question) => typeof question.correctAnswer === 'string' ? [question.correctAnswer] : []));
      for (const position of ['A', 'B', 'C', 'D']) {
        if (!positions.has(position)) errors.push(`${kind}: first 8 questions do not include answer position ${position}`);
      }
    }
  }
  return errors;
}

function normalizedShape(text: string, removable: Array<string | undefined>) {
  let normalized = text.toLocaleLowerCase();
  for (const value of removable.filter((item): item is string => Boolean(item))) {
    normalized = normalized.replaceAll(value.toLocaleLowerCase(), '<topic>');
  }
  return normalized.replace(/\d+(?:\.\d+)?/g, '<number>').replace(/[^a-z\u4e00-\u9fff<>]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function repeatedShapes(items: Array<{ text: string; removable: Array<string | undefined> }>) {
  const shapes = items.map((item) => normalizedShape(item.text, item.removable)).filter(Boolean);
  return new Set(shapes).size !== shapes.length;
}

function auditQuestionGroup(kind: 'listeningSets' | 'readingSets', sets: Array<{ questions?: DiversityQuestionCandidate[] }>) {
  const errors: string[] = [];
  const questions = sets.flatMap((set) => set.questions ?? []);
  if (questions.length >= 10) {
    const prompts = questions.map((question) => normalizedShape(question.prompt ?? '', []));
    if (new Set(prompts).size / questions.length < 0.5) errors.push(`${kind}: prompt diversity below 50%`);
    const answers = questions.map((question) => question.answer).filter((answer): answer is number => Number.isInteger(answer));
    for (const answer of new Set(answers)) {
      if (answers.filter((item) => item === answer).length / answers.length > 0.6) errors.push(`${kind}: answer position ${answer} exceeds 60%`);
    }
  }
  return errors;
}

export function auditContentDiversity(inventory: DiversityInventory): string[] {
  const errors: string[] = [];
  if (repeatedShapes(inventory.listeningSets.map((set) => ({ text: set.transcript ?? '', removable: [set.theme, set.themeEn] })))) errors.push('listeningSets: repeated normalized transcript');
  if (repeatedShapes(inventory.readingSets.map((set) => ({ text: set.passage ?? '', removable: [set.theme] })))) errors.push('readingSets: repeated normalized passage');
  errors.push(...auditQuestionGroup('listeningSets', inventory.listeningSets));
  errors.push(...auditQuestionGroup('readingSets', inventory.readingSets));
  for (const set of inventory.listeningSets) if (!set.audioSrc?.trim()) errors.push(`listeningSets:${set.id ?? 'unknown'}: missing audio reference`);
  if (inventory.translations.length > 1 && repeatedShapes(inventory.translations.map((item) => ({ text: item.prompt ?? '', removable: [item.theme] })))) errors.push('translations: repeated normalized prompt');
  if (inventory.writingPrompts.length > 1 && repeatedShapes(inventory.writingPrompts.map((item) => ({ text: item.prompt ?? '', removable: [item.topic] })))) errors.push('writingPrompts: repeated normalized prompt');
  return errors;
}
