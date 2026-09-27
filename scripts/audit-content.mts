import inventory from '../content/v1/inventory.json' with { type: 'json' };
import { auditContentDiversity, auditContentInventory, auditGeneratedQuestions, auditKnowledgeExamples } from '../src/content/contentAudit.ts';
import { getPracticeItems } from '../src/content/catalog.ts';
import culturePrompts from '../content/v1/cultureTranslations.json' with { type: 'json' };
import vocabulary from '../content/v1/vocabulary.json' with { type: 'json' };
import { auditCultureTranslations } from '../src/features/translation/cultureTranslation.ts';

const errors = [
  ...auditContentInventory(inventory),
  ...auditContentDiversity(inventory),
  ...auditGeneratedQuestions({ vocabulary: getPracticeItems('vocabulary'), grammar: getPracticeItems('grammar') }),
  ...auditKnowledgeExamples(inventory.vocabulary, inventory.collocations),
  ...auditCultureTranslations(culturePrompts, vocabulary),
];
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(Object.fromEntries(Object.entries(inventory).map(([key, value]) => [key, value.length])));
