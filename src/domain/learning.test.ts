import { describe, expect, it } from 'vitest';
import { normalizeUserSettings } from './learning';

describe('normalizeUserSettings', () => {
  it('adds safe defaults to settings saved by an older application version', () => {
    expect(normalizeUserSettings({
      id: 'current',
      examDate: '2026-12-12',
      dailyMinutes: 60,
      playbackRate: 1,
      updatedAt: '2026-09-24T00:00:00.000Z',
    })).toMatchObject({
      reminderTime: '',
      readiness: {
        registrationConfirmed: false,
        admissionTicketPrepared: false,
        equipmentPrepared: false,
      },
    });
  });
});
