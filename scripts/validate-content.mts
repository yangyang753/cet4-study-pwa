import content from '../src/content/starter/content.json' with { type: 'json' };
import { auditContentPack } from '../src/content/validateContent.ts';
import { auditFoundationVocabulary, foundationVocabulary } from '../src/content/foundationVocabulary.ts';
import { learningVocabulary } from '../src/content/vocabularyLearning.ts';
import { auditVocabularyEnrichment, vocabularyEnrichment } from '../src/content/vocabularyEnrichment.ts';

const errors = [
  ...auditContentPack(content),
  ...auditFoundationVocabulary(foundationVocabulary, learningVocabulary),
  ...auditVocabularyEnrichment(vocabularyEnrichment, [...foundationVocabulary, ...learningVocabulary]),
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Validated ${content.questions.length} questions, ${content.vocabulary.length} core vocabulary entries, ${foundationVocabulary.length} foundation entries, ${vocabularyEnrichment.length} enrichment groups, and ${content.audioAssets.length} audio asset.`);
