import { describe, expect, it } from 'vitest';
import { previousStudyDate, studyDate } from './studyDate';

describe('study date helpers', () => {
  it('uses the current China date while UTC is still on the previous day', () => {
    expect(studyDate(new Date('2026-09-24T16:30:00.000Z'))).toBe('2026-09-25');
  });

  it('returns the previous calendar study date across a month boundary', () => {
    expect(previousStudyDate('2026-10-01')).toBe('2026-09-30');
  });
});
