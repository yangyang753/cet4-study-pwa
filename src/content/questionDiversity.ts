import type { QuestionSkillTag } from '../domain/content';

type CandidateQuestion = { prompt?: string; options?: string[]; answer?: number; skillTag?: string };
type CandidateSet = { id?: string; theme?: string; themeEn?: string; segments?: Array<{ text?: string }>; questions?: CandidateQuestion[] };

const requiredSkills: Record<'listening' | 'reading', QuestionSkillTag[]> = {
  listening: ['detail', 'reason', 'purpose', 'action', 'attitude', 'inference', 'main-idea'],
  reading: ['detail', 'inference', 'main-idea', 'vocabulary-in-context', 'reference', 'paragraph-role', 'structure'],
};

const formerFillers = new Set([
  'it has been cancelled.', 'a teacher became unavailable.', 'the participation fee increased.', 'a building closed permanently.',
  'no advance action is needed.', 'the deadline was yesterday.', 'only cash and a passport.', 'sports equipment from home.',
  'no materials of any kind.', 'professional experience is compulsory.', 'a formal certificate is required.',
  'only final-year students may join.', 'a new national examination rule', 'a commercial advertising dispute',
  'a cancelled university course', 'only university teachers', 'no volunteers at all', 'a single organizer',
]);

function normalizedPrompt(prompt: string, set: CandidateSet) {
  let normalized = prompt.toLocaleLowerCase();
  for (const removable of [set.theme, set.themeEn].filter((value): value is string => Boolean(value))) {
    normalized = normalized.replaceAll(removable.toLocaleLowerCase(), '<topic>');
  }
  return normalized.replace(/\d+(?:[.,]\d+)?/g, '<number>').replace(/[^a-z\u4e00-\u9fff<>]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function auditQuestionTemplateDiversity(sets: CandidateSet[], kind: 'listening' | 'reading'): string[] {
  const errors: string[] = [];
  const questions = sets.flatMap((set) => (set.questions ?? []).map((question) => ({ set, question })));
  if (!questions.length) return [`${kind}: no questions available`];

  if (kind === 'listening') {
    const segmentUses = new Map<string, Set<string>>();
    for (const set of sets) for (const segment of set.segments ?? []) {
      const normalized = (segment.text ?? '').toLocaleLowerCase().replace(/[^a-z]+/g, ' ').trim();
      if (!normalized) continue;
      const ids = segmentUses.get(normalized) ?? new Set<string>();
      ids.add(set.id ?? 'unknown');
      segmentUses.set(normalized, ids);
    }
    for (const [segment, ids] of segmentUses) {
      if (ids.size > 2) errors.push(`listening: repeated transcript segment appears in ${ids.size} sets: "${segment.slice(0, 80)}"`);
    }
  }

  const shapes = questions.map(({ set, question }) => normalizedPrompt(question.prompt ?? '', set));
  const counts = new Map<string, number>();
  for (const shape of shapes) counts.set(shape, (counts.get(shape) ?? 0) + 1);
  const ratio = new Set(shapes).size / shapes.length;
  if (ratio < 0.6) errors.push(`${kind}: normalized unique template ratio ${ratio.toFixed(2)} is below 0.60`);
  const dominant = [...counts.entries()].sort((left, right) => right[1] - left[1])[0];
  if (dominant && dominant[1] / shapes.length > 0.15) errors.push(`${kind}: template "${dominant[0]}" exceeds 15% (${dominant[1]}/${shapes.length})`);

  const presentSkills = new Set(questions.map(({ question }) => question.skillTag));
  const missing = requiredSkills[kind].filter((skill) => !presentSkills.has(skill));
  if (missing.length) errors.push(`${kind}: missing skill tags ${missing.join(', ')}`);

  const optionUses = new Map<string, number>();
  for (const { set, question } of questions) {
    const options = question.options ?? [];
    const normalizedOptions = options.map((option) => option.trim().toLocaleLowerCase());
    if (new Set(normalizedOptions).size !== normalizedOptions.length) errors.push(`${kind}:${set.id ?? 'unknown'}: duplicate option text`);
    for (const option of normalizedOptions) optionUses.set(option, (optionUses.get(option) ?? 0) + 1);
  }
  for (const filler of formerFillers) {
    const uses = optionUses.get(filler) ?? 0;
    if (uses / questions.length > 0.05) errors.push(`${kind}: fixed irrelevant option "${filler}" appears in more than 5% of questions`);
  }
  return errors;
}
