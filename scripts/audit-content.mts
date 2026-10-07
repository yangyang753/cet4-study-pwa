import inventory from '../content/v1/inventory.json' with { type: 'json' };
import { auditContentDiversity, auditContentInventory, auditContentShapes, auditFullMockMaterial, auditGeneratedQuestions, auditKnowledgeExamples } from '../src/content/contentAudit.ts';
import { getPracticeItems } from '../src/content/catalog.ts';
import { cultureTranslationBank as culturePrompts } from '../src/content/cultureTranslations.ts';
import vocabulary from '../content/v1/vocabulary.json' with { type: 'json' };
import { auditCultureTranslations } from '../src/features/translation/cultureTranslation.ts';
import { auditLearningVocabulary, learningVocabulary } from '../src/content/vocabularyLearning.ts';
import { foundationVocabulary } from '../src/content/foundationVocabulary.ts';
import { auditPracticeVocabularyCoverage } from '../src/content/vocabularyCoverage.ts';

const practiceCorpus = {
  listeningSets: inventory.listeningSets,
  readingSets: inventory.readingSets,
  translations: inventory.translations,
  writingPrompts: inventory.writingPrompts,
};

const errors = [
  ...auditContentInventory(inventory),
  ...auditContentShapes(inventory),
  ...auditContentDiversity(inventory),
  ...auditFullMockMaterial(inventory),
  ...auditGeneratedQuestions({ vocabulary: getPracticeItems('vocabulary'), grammar: getPracticeItems('grammar') }),
  ...auditKnowledgeExamples(inventory.vocabulary, inventory.collocations),
  ...auditCultureTranslations(culturePrompts, vocabulary),
  ...auditLearningVocabulary(learningVocabulary),
  ...auditPracticeVocabularyCoverage(practiceCorpus, [...foundationVocabulary, ...learningVocabulary], { minimumOccurrences: 40 }),
];
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(Object.fromEntries(Object.entries(inventory).map(([key, value]) => [key, value.length])));
