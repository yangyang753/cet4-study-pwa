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

const minimums: Record<keyof ContentInventory, number> = { vocabulary: 800, collocations: 120, grammarTopics: 15, listeningSets: 24, readingSets: 30, translations: 12, writingPrompts: 12, mockExams: 6 };

export function auditContentInventory(inventory: ContentInventory): string[] {
  const errors: string[] = [];
  for (const [key, minimum] of Object.entries(minimums) as [keyof ContentInventory, number][]) {
    if (inventory[key].length < minimum) errors.push(`${key}: expected at least ${minimum}, received ${inventory[key].length}`);
    const ids = inventory[key].map((item) => typeof item === 'object' && item && 'id' in item ? String(item.id) : '');
    const seen = new Set<string>();
    ids.forEach((id) => { if (seen.has(id)) errors.push(`${key}: duplicate id ${id}`); seen.add(id); });
  }
  return errors;
}
