import { describe, expect, it } from 'vitest';
import { auditContentInventory } from './contentAudit';
import inventory from '../../content/v1/inventory.json';

describe('auditContentInventory', () => {
  it('reports every category below the approved minimum', () => {
    const errors = auditContentInventory({ vocabulary: [], collocations: [], grammarTopics: [], listeningSets: [], readingSets: [], translations: [], writingPrompts: [], mockExams: [] });
    expect(errors).toContain('vocabulary: expected at least 800, received 0');
    expect(errors).toContain('listeningSets: expected at least 24, received 0');
    expect(errors).toContain('mockExams: expected at least 6, received 0');
  });

  it('accepts an inventory meeting every minimum', () => {
    const make = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `id-${index}` }));
    expect(auditContentInventory({ vocabulary: make(800), collocations: make(120), grammarTopics: make(15), listeningSets: make(24), readingSets: make(30), translations: make(12), writingPrompts: make(12), mockExams: make(6) })).toEqual([]);
  });

  it('accepts only shipped mocks with the complete 57-question structure', () => {
    expect(auditContentInventory(inventory)).toEqual([]);
  });
});
