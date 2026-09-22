import { z } from 'zod';
import type { ContentPack } from '../domain/content';

const id = z.string().trim().min(1);
const optionSchema = z.object({ id, text: z.string().trim().min(1) });
const questionBase = {
  id,
  version: z.number().int().positive(),
  difficulty: z.enum(['foundation', 'standard', 'challenge']),
  prompt: z.string().trim().min(1),
  knowledgePointIds: z.array(id).min(1),
  explanationZh: z.string().trim().min(1),
  sourceNote: z.string().trim().min(1),
};

const objectiveSchema = z.object({
  ...questionBase,
  type: z.enum(['vocabulary', 'news', 'conversation', 'passage', 'cloze', 'matching', 'reading']),
  options: z.array(optionSchema).min(1),
  correctAnswer: z.union([id, z.array(id).min(1)]),
  audioAssetId: id.optional(),
});

const subjectiveSchema = z.object({
  ...questionBase,
  type: z.enum(['translation', 'writing']),
  rubric: z.array(z.string().trim().min(1)).min(1),
  referenceAnswer: z.string().trim().min(1),
});

const contentPackSchema = z.object({
  version: z.string().trim().min(1),
  knowledgePoints: z.array(z.object({
    id,
    title: z.string().trim().min(1),
    category: z.enum(['vocabulary', 'grammar', 'listening', 'reading', 'translation', 'writing']),
    summary: z.string().trim().min(1).optional(),
  })).min(1),
  vocabulary: z.array(z.object({
    id,
    word: z.string().trim().min(1),
    phonetic: z.string().trim().min(1),
    partOfSpeech: z.string().trim().min(1),
    meaningZh: z.string().trim().min(1),
    example: z.string().trim().min(1),
    derivatives: z.array(z.string().trim().min(1)),
    confusables: z.array(z.string().trim().min(1)),
  })).min(1),
  questions: z.array(z.discriminatedUnion('type', [objectiveSchema, subjectiveSchema])).min(1),
  practiceSets: z.array(z.object({ id, title: z.string().trim().min(1), questionIds: z.array(id).min(1) })),
  audioAssets: z.array(z.object({
    id,
    src: z.string().trim().min(1),
    durationSeconds: z.number().positive(),
    transcript: z.string().trim().min(1),
    segments: z.array(z.object({
      id,
      start: z.number().nonnegative(),
      end: z.number().positive(),
      text: z.string().trim().min(1),
    })).min(1),
  })),
}).superRefine((pack, context) => {
  const pointIds = new Set(pack.knowledgePoints.map((point) => point.id));
  const questionIds = new Set(pack.questions.map((question) => question.id));
  const audioIds = new Set(pack.audioAssets.map((audio) => audio.id));

  for (const [index, question] of pack.questions.entries()) {
    for (const pointId of question.knowledgePointIds) {
      if (!pointIds.has(pointId)) context.addIssue({ code: 'custom', path: ['questions', index, 'knowledgePointIds'], message: `Unknown knowledge point: ${pointId}` });
    }
    if ('options' in question) {
      const optionIds = new Set(question.options.map((option) => option.id));
      const answers = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
      if (answers.some((answer) => !optionIds.has(answer))) context.addIssue({ code: 'custom', path: ['questions', index, 'correctAnswer'], message: 'correctAnswer must reference an option' });
      if (question.audioAssetId && !audioIds.has(question.audioAssetId)) context.addIssue({ code: 'custom', path: ['questions', index, 'audioAssetId'], message: 'Unknown audio asset' });
    }
  }

  for (const [index, set] of pack.practiceSets.entries()) {
    if (set.questionIds.some((questionId) => !questionIds.has(questionId))) context.addIssue({ code: 'custom', path: ['practiceSets', index, 'questionIds'], message: 'Unknown question reference' });
  }
  for (const [audioIndex, audio] of pack.audioAssets.entries()) {
    let previousEnd = 0;
    for (const [segmentIndex, segment] of audio.segments.entries()) {
      if (segment.end <= segment.start || segment.start < previousEnd || segment.end > audio.durationSeconds) {
        context.addIssue({ code: 'custom', path: ['audioAssets', audioIndex, 'segments', segmentIndex], message: 'segments must be ordered and within duration' });
      }
      previousEnd = segment.end;
    }
  }
});

export function parseContentPack(input: unknown): ContentPack {
  return contentPackSchema.parse(input) as ContentPack;
}
