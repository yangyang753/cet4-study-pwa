import { describe, expect, it } from 'vitest';
import { buildStudyCalendar } from './studyCalendar';

describe('study calendar export', () => {
  it('builds a daily reminder that ends on the saved exam date', () => {
    const calendar = buildStudyCalendar({
      startDate: '2026-10-05',
      examDate: '2026-12-12',
      reminderTime: '20:30',
      studyUrl: 'https://example.test/cet4/#/today',
    });

    expect(calendar).toContain('BEGIN:VCALENDAR');
    expect(calendar).toContain('DTSTART:20261005T203000');
    expect(calendar).toContain('RRULE:FREQ=DAILY;UNTIL=20261212T235900');
    expect(calendar).toContain('TRIGGER:-PT0M');
    expect(calendar).toContain('URL:https://example.test/cet4/#/today');
  });

  it('rejects an invalid reminder time instead of creating a broken calendar', () => {
    expect(() => buildStudyCalendar({ startDate: '2026-10-05', examDate: '2026-12-12', reminderTime: '25:99', studyUrl: '' })).toThrow('Invalid reminder time');
  });
});
