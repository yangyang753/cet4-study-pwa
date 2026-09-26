import { describe, expect, it } from 'vitest';
import { getPracticeItems } from '../../content/catalog';
import { createDiagnosticSession, restoreDiagnosticSession } from './diagnosticSession';

const catalog = [
  ...getPracticeItems('vocabulary'),
  ...getPracticeItems('grammar'),
  ...getPracticeItems('listening'),
  ...getPracticeItems('reading'),
  ...getPracticeItems('writing'),
  ...getPracticeItems('translation'),
];

describe('diagnostic session', () => {
  it('selects the exact standard diagnostic composition in a stable session order', () => {
    const first = createDiagnosticSession(catalog, 'session-a', '2026-09-26', '2026-09-26T09:00:00.000Z');
    const same = createDiagnosticSession(catalog, 'session-a', '2026-09-26', '2026-09-26T09:00:00.000Z');
    const different = createDiagnosticSession(catalog, 'session-b', '2026-09-26', '2026-09-26T09:00:00.000Z');

    expect(first.questionIds).toHaveLength(20);
    expect(first.questionIds).toEqual(same.questionIds);
    expect(first.questionIds).not.toEqual(different.questionIds);
    expect(first.kinds).toEqual({ vocabulary: 3, grammar: 3, listening: 6, reading: 6, writing: 1, translation: 1 });
  });

  it('restores only a version-two session whose questions still exist', () => {
    const session = createDiagnosticSession(catalog, 'session-a', '2026-09-26', '2026-09-26T09:00:00.000Z');
    expect(restoreDiagnosticSession(JSON.stringify(session), catalog)?.sessionId).toBe('session-a');
    expect(restoreDiagnosticSession('{broken', catalog)).toBeNull();
    expect(restoreDiagnosticSession(JSON.stringify({ ...session, questionIds: [...session.questionIds, 'deleted-question'] }), catalog)).toBeNull();
    expect(restoreDiagnosticSession(JSON.stringify({ ...session, version: 1 }), catalog)).toBeNull();
  });
});
