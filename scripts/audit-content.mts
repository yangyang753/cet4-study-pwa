import inventory from '../content/v1/inventory.json' with { type: 'json' };
import { auditContentDiversity, auditContentInventory, auditGeneratedQuestions, auditKnowledgeExamples } from '../src/content/contentAudit.ts';
import { getPracticeItems } from '../src/content/catalog.ts';

const errors = [
  ...auditContentInventory(inventory),
  ...auditContentDiversity(inventory),
  ...auditGeneratedQuestions({ vocabulary: getPracticeItems('vocabulary'), grammar: getPracticeItems('grammar') }),
  ...auditKnowledgeExamples(inventory.vocabulary, inventory.collocations),
];
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(Object.fromEntries(Object.entries(inventory).map(([key, value]) => [key, value.length])));
