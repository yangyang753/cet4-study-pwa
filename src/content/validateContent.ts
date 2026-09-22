import { ZodError } from 'zod';
import { parseContentPack } from './schema';

function duplicateErrors(items: unknown[], kind: string): string[] {
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const item of items) {
    const id = typeof item === 'object' && item !== null && 'id' in item ? String(item.id) : '';
    if (seen.has(id)) errors.push(`Duplicate ${kind} id: ${id}`);
    seen.add(id);
  }
  return errors;
}

export function auditContentPack(input: unknown): string[] {
  if (typeof input !== 'object' || input === null) return ['Content pack must be an object'];
  const record = input as Record<string, unknown>;
  const errors = [
    ...duplicateErrors(Array.isArray(record.knowledgePoints) ? record.knowledgePoints : [], 'knowledge point'),
    ...duplicateErrors(Array.isArray(record.vocabulary) ? record.vocabulary : [], 'vocabulary'),
    ...duplicateErrors(Array.isArray(record.questions) ? record.questions : [], 'question'),
    ...duplicateErrors(Array.isArray(record.practiceSets) ? record.practiceSets : [], 'practice set'),
    ...duplicateErrors(Array.isArray(record.audioAssets) ? record.audioAssets : [], 'audio asset'),
  ];
  try {
    parseContentPack(input);
  } catch (error) {
    if (error instanceof ZodError) errors.push(...error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
    else errors.push(error instanceof Error ? error.message : String(error));
  }
  return errors;
}
