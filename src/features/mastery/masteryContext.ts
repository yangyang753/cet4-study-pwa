import type { StudyKind } from '../planner/planDay';
import { localStudyDate } from './taskProgress';

export interface MasteryContext {
  taskId: string;
  kind: StudyKind;
  sourceQuestionIds: string[];
}

const studyKinds: StudyKind[] = ['vocabulary', 'grammar', 'listening', 'reading', 'translation', 'writing', 'review', 'mock'];

function safeKind(value: string): StudyKind {
  return studyKinds.includes(value as StudyKind) ? value as StudyKind : 'vocabulary';
}

export function encodeMasteryContext(context: MasteryContext): string {
  const params = new URLSearchParams({ taskId: context.taskId, kind: context.kind });
  [...new Set(context.sourceQuestionIds)].slice(0, 60).forEach((id) => params.append('source', id));
  return params.toString();
}

export function decodeMasteryContext(params: URLSearchParams, routeKind: string): MasteryContext {
  const kind = safeKind(params.get('kind') ?? routeKind);
  const sourceQuestionIds = [...new Set(params.getAll('source').filter(Boolean))].slice(0, 60);
  return {
    kind,
    taskId: params.get('taskId')?.trim() || `${localStudyDate()}:${kind}`,
    sourceQuestionIds,
  };
}
