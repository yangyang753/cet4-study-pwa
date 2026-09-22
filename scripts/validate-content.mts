import content from '../src/content/starter/content.json' with { type: 'json' };
import { auditContentPack } from '../src/content/validateContent.ts';

const errors = auditContentPack(content);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Validated ${content.questions.length} questions, ${content.vocabulary.length} vocabulary entries, and ${content.audioAssets.length} audio asset.`);
