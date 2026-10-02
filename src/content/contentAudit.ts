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
  listeningDistribution?: { news?: number; conversation?: number; passage?: number };
  readingDistribution?: { cloze?: number; matching?: number; reading?: number };
}

interface QuestionSetCandidate { id?: string; type?: string; questions?: unknown[] }

interface DiversityQuestionCandidate { prompt?: string; answer?: number; options?: string[]; skillTag?: string }
interface ListeningDiversityCandidate extends QuestionSetCandidate { theme?: string; themeEn?: string; transcript?: string; audioSrc?: string; segments?: Array<{ text?: string; speaker?: string }>; questions?: DiversityQuestionCandidate[] }
interface ReadingDiversityCandidate extends QuestionSetCandidate { theme?: string; passage?: string; questions?: DiversityQuestionCandidate[] }
interface SubjectiveDiversityCandidate { id?: string; theme?: string; topic?: string; prompt?: string; referenceAnswer?: string }
interface DiversityInventory {
  listeningSets: ListeningDiversityCandidate[];
  readingSets: ReadingDiversityCandidate[];
  translations: SubjectiveDiversityCandidate[];
  writingPrompts: SubjectiveDiversityCandidate[];
}

const minimums: Record<keyof ContentInventory, number> = { vocabulary: 800, collocations: 120, grammarTopics: 15, listeningSets: 24, readingSets: 30, translations: 12, writingPrompts: 12, mockExams: 10 };

const record = (value: unknown): Record<string, unknown> => typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

function auditQuestions(kind: 'listeningSets' | 'readingSets', setId: string, value: unknown) {
  const errors: string[] = [];
  if (!Array.isArray(value) || value.length === 0) return [`${kind}:${setId}: missing questions`];
  value.forEach((candidate, index) => {
    const question = record(candidate);
    const options = Array.isArray(question.options) ? question.options : [];
    if (!text(question.prompt)) errors.push(`${kind}:${setId}: question ${index + 1} missing prompt`);
    if (options.length < 2 || options.some((option) => !text(option))) errors.push(`${kind}:${setId}: question ${index + 1} requires non-empty options`);
    if (!Number.isInteger(question.answer) || Number(question.answer) < 0 || Number(question.answer) >= options.length) errors.push(`${kind}:${setId}: question ${index + 1} answer must be an option index`);
  });
  return errors;
}

export function auditContentShapes(inventory: ContentInventory): string[] {
  const errors: string[] = [];
  inventory.vocabulary.forEach((candidate) => {
    const item = record(candidate); const id = String(item.id ?? 'unknown');
    for (const field of ['word', 'phonetic', 'meaningZh']) if (!text(item[field])) errors.push(`vocabulary:${id}: missing ${field}`);
  });
  inventory.collocations.forEach((candidate) => {
    const item = record(candidate); const id = String(item.id ?? 'unknown');
    for (const field of ['phrase', 'meaningZh', 'example', 'exampleZh']) if (!text(item[field])) errors.push(`collocations:${id}: missing ${field}`);
  });
  inventory.grammarTopics.forEach((candidate) => {
    const item = record(candidate); const id = String(item.id ?? 'unknown');
    if (!text(item.title)) errors.push(`grammarTopics:${id}: missing title`);
    if (!text(item.summary)) errors.push(`grammarTopics:${id}: missing summary`);
    if (!Array.isArray(item.checklist) || item.checklist.length === 0 || item.checklist.some((entry) => !text(entry))) errors.push(`grammarTopics:${id}: missing checklist`);
  });
  inventory.listeningSets.forEach((candidate) => {
    const item = record(candidate); const id = String(item.id ?? 'unknown');
    if (!text(item.transcript)) errors.push(`listeningSets:${id}: missing transcript`);
    if (!text(item.audioSrc)) errors.push(`listeningSets:${id}: missing audioSrc`);
    errors.push(...auditQuestions('listeningSets', id, item.questions));
  });
  inventory.readingSets.forEach((candidate) => {
    const item = record(candidate); const id = String(item.id ?? 'unknown');
    if (!text(item.passage)) errors.push(`readingSets:${id}: missing passage`);
    errors.push(...auditQuestions('readingSets', id, item.questions));
  });
  inventory.translations.forEach((candidate) => {
    const item = record(candidate); const id = String(item.id ?? 'unknown');
    if (!text(item.prompt)) errors.push(`translations:${id}: missing prompt`);
    if (!text(item.referenceAnswer)) errors.push(`translations:${id}: missing referenceAnswer`);
  });
  inventory.writingPrompts.forEach((candidate) => {
    const item = record(candidate); const id = String(item.id ?? 'unknown');
    if (!text(item.prompt)) errors.push(`writingPrompts:${id}: missing prompt`);
    if (!text(item.referenceAnswer)) errors.push(`writingPrompts:${id}: missing referenceAnswer`);
  });
  const listeningIds = new Set(inventory.listeningSets.map((item) => String(record(item).id ?? '')));
  const readingIds = new Set(inventory.readingSets.map((item) => String(record(item).id ?? '')));
  const translationIds = new Set(inventory.translations.map((item) => String(record(item).id ?? '')));
  const writingIds = new Set(inventory.writingPrompts.map((item) => String(record(item).id ?? '')));
  inventory.mockExams.forEach((candidate) => {
    const item = record(candidate); const id = String(item.id ?? 'unknown');
    for (const reference of Array.isArray(item.listeningSetIds) ? item.listeningSetIds : []) if (!listeningIds.has(String(reference))) errors.push(`mockExams:${id}: unknown listening set ${reference}`);
    for (const reference of Array.isArray(item.readingSetIds) ? item.readingSetIds : []) if (!readingIds.has(String(reference))) errors.push(`mockExams:${id}: unknown reading set ${reference}`);
    if (!translationIds.has(String(item.translationId ?? ''))) errors.push(`mockExams:${id}: unknown translation ${String(item.translationId ?? '')}`);
    if (!writingIds.has(String(item.writingId ?? ''))) errors.push(`mockExams:${id}: unknown writing prompt ${String(item.writingId ?? '')}`);
  });
  return errors;
}

interface FullMockMaterialInventory {
  listeningSets: Array<{ id?: string; type?: string; transcript?: string }>;
  readingSets: Array<{ id?: string; type?: string; passage?: string }>;
  translations: Array<{ id?: string; prompt?: string }>;
}

const englishWordCount = (value = '') => value.trim().split(/\s+/).filter(Boolean).length;
const chineseCharacterCount = (value = '') => (value.match(/[\u3400-\u9fff]/g) ?? []).length;

export function auditFullMockMaterial(inventory: FullMockMaterialInventory): string[] {
  const errors: string[] = [];
  const listeningRanges: Record<string, [number, number]> = { news: [145, 170], conversation: [240, 280], passage: [220, 240] };
  const readingRanges: Record<string, [number, number]> = { cloze: [200, 250], matching: [950, 1100], reading: [300, 350] };
  for (const set of inventory.listeningSets) {
    const range = listeningRanges[set.type ?? ''];
    if (!range) continue;
    const count = englishWordCount(set.transcript);
    if (count < range[0] || count > range[1]) errors.push(`listeningSets:${set.id ?? 'unknown'}: ${set.type} transcript must contain ${range[0]}-${range[1]} words, received ${count}`);
  }
  for (const set of inventory.readingSets) {
    const range = readingRanges[set.type ?? ''];
    if (!range) continue;
    const count = englishWordCount(set.passage);
    if (count < range[0] || count > range[1]) errors.push(`readingSets:${set.id ?? 'unknown'}: ${set.type} passage must contain ${range[0]}-${range[1]} words, received ${count}`);
  }
  for (const item of inventory.translations) {
    const count = chineseCharacterCount(item.prompt);
    if (count < 140 || count > 160) errors.push(`translations:${item.id ?? 'unknown'}: full-mock prompt must contain 140-160 Chinese characters, received ${count}`);
  }
  return errors;
}

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
  const listeningSets = new Map((inventory.listeningSets as QuestionSetCandidate[]).map((set) => [set.id, set]));
  const readingSets = new Map((inventory.readingSets as QuestionSetCandidate[]).map((set) => [set.id, set]));
  for (const mock of inventory.mockExams as MockCandidate[]) {
    if (!mock.id || !mock.listeningSetIds || !mock.readingSetIds) continue;
    const listeningCount = mock.listeningDistribution
      ? (mock.listeningDistribution.news ?? 0) + (mock.listeningDistribution.conversation ?? 0) + (mock.listeningDistribution.passage ?? 0)
      : mock.listeningSetIds.reduce((total, id) => total + (listeningCounts.get(id) ?? 0), 0);
    const readingCount = mock.readingDistribution
      ? (mock.readingDistribution.cloze ?? 0) + (mock.readingDistribution.matching ?? 0) + (mock.readingDistribution.reading ?? 0)
      : mock.readingSetIds.reduce((total, id) => total + (readingCounts.get(id) ?? 0), 0);
    const total = 2 + listeningCount + readingCount;
    if (listeningCount !== 25) errors.push(`${mock.id}: expected 25 listening questions, received ${listeningCount}`);
    if (readingCount !== 30) errors.push(`${mock.id}: expected 30 reading questions, received ${readingCount}`);
    if (total !== 57) errors.push(`${mock.id}: expected 57 total questions, received ${total}`);
    if (mock.timingMinutes !== 125) errors.push(`${mock.id}: expected 125 minutes, received ${mock.timingMinutes}`);
    if (!mock.translationId) errors.push(`${mock.id}: missing translation reference`);
    if (!mock.writingId) errors.push(`${mock.id}: missing writing reference`);
    const listeningDistribution = mock.listeningDistribution ?? mock.listeningSetIds.reduce((counts, id) => {
      const set = listeningSets.get(id); const count = set?.questions?.length ?? 0;
      if (set?.type === 'news' || set?.type === 'conversation' || set?.type === 'passage') counts[set.type] += count;
      return counts;
    }, { news: 0, conversation: 0, passage: 0 });
    if (listeningDistribution.news !== 7 || listeningDistribution.conversation !== 8 || listeningDistribution.passage !== 10) {
      errors.push(`${mock.id}: expected listening distribution news 7 / conversation 8 / passage 10, received ${listeningDistribution.news ?? 0} / ${listeningDistribution.conversation ?? 0} / ${listeningDistribution.passage ?? 0}`);
    }
    const readingDistribution = mock.readingDistribution ?? mock.readingSetIds.reduce((counts, id) => {
      const set = readingSets.get(id); const count = set?.questions?.length ?? 0;
      if (set?.type === 'cloze' || set?.type === 'matching' || set?.type === 'reading') counts[set.type] += count;
      return counts;
    }, { cloze: 0, matching: 0, reading: 0 });
    if (readingDistribution.cloze !== 10 || readingDistribution.matching !== 10 || readingDistribution.reading !== 10) {
      errors.push(`${mock.id}: expected reading distribution cloze 10 / matching 10 / reading 10, received ${readingDistribution.cloze ?? 0} / ${readingDistribution.matching ?? 0} / ${readingDistribution.reading ?? 0}`);
    }
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

interface KnowledgeExampleCandidate { id?: string; example?: string; exampleZh?: string }

export function auditKnowledgeExamples(vocabulary: KnowledgeExampleCandidate[], collocations: KnowledgeExampleCandidate[]): string[] {
  const errors: string[] = [];
  const groups = [{ kind: 'vocabulary', items: vocabulary }, { kind: 'collocations', items: collocations }] as const;
  for (const group of groups) {
    for (const item of group.items) {
      const id = item.id ?? 'unknown';
      const example = item.example?.trim() ?? '';
      if (/often appears in college English reading and listening/i.test(example) || /Use .+ to express this idea clearly in CET-4/i.test(example)) {
        errors.push(`${group.kind}:${id}: generic placeholder example`);
      }
      if (!item.exampleZh?.trim()) errors.push(`${group.kind}:${id}: missing Chinese memory cue`);
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
  errors.push(...auditQuestionTemplateDiversity(inventory.listeningSets, 'listening'));
  errors.push(...auditQuestionTemplateDiversity(inventory.readingSets, 'reading'));
  for (const set of inventory.listeningSets) {
    if (!set.audioSrc?.trim()) errors.push(`listeningSets:${set.id ?? 'unknown'}: missing audio reference`);
    if (set.type === 'conversation') {
      const speakers = (set.segments ?? []).map((segment) => segment.speaker).filter(Boolean);
      if (new Set(speakers).size < 2) errors.push(`listeningSets:${set.id ?? 'unknown'}: conversation requires at least two speakers`);
      if (speakers.some((speaker, index) => index > 0 && speaker === speakers[index - 1])) errors.push(`listeningSets:${set.id ?? 'unknown'}: conversation speakers must alternate`);
    }
  }
  if (inventory.translations.length > 1 && repeatedShapes(inventory.translations.map((item) => ({ text: item.prompt ?? '', removable: [item.theme] })))) errors.push('translations: repeated normalized prompt');
  if (inventory.writingPrompts.length > 1 && repeatedShapes(inventory.writingPrompts.map((item) => ({ text: item.prompt ?? '', removable: [item.topic] })))) errors.push('writingPrompts: repeated normalized prompt');
  for (const item of inventory.translations) if ((item.prompt ?? '').replace(/\s/g, '').length < 80) errors.push(`translations:${item.id ?? 'unknown'}: prompt shorter than 80 characters`);
  for (const item of inventory.writingPrompts) {
    const words = (item.referenceAnswer ?? '').trim().split(/\s+/).filter(Boolean).length;
    if (words < 120 || words > 180) errors.push(`writingPrompts:${item.id ?? 'unknown'}: reference answer must contain 120-180 words, received ${words}`);
  }
  if (inventory.writingPrompts.length > 3) {
    const bodies = inventory.writingPrompts.map((item) => (item.referenceAnswer ?? '').split(/(?<=[.!?])\s+/).slice(1).join(' ').toLocaleLowerCase().replace(/\s+/g, ' ').trim());
    if (new Set(bodies).size / bodies.length < 0.8) errors.push('writingPrompts: reference answer bodies must be meaningfully distinct');
  }
  return errors;
}
import { auditQuestionTemplateDiversity } from './questionDiversity';
