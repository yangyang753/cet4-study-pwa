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
