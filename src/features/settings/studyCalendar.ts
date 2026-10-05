interface StudyCalendarOptions {
  startDate: string;
  examDate: string;
  reminderTime: string;
  studyUrl: string;
}

const compactDate = (value: string) => value.replaceAll('-', '');
const compactTime = (value: string) => value.replace(':', '');
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

function escapeIcs(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll(',', '\\,').replaceAll(';', '\\;').replace(/\r?\n/g, '\\n');
}

export function buildStudyCalendar({ startDate, examDate, reminderTime, studyUrl }: StudyCalendarOptions) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) throw new Error('Invalid reminder time');
  if (!validDate(startDate) || !validDate(examDate)) throw new Error('Invalid study date');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CET-4 Study Lab//Daily Study Reminder//ZH-CN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:cet4-daily-${compactDate(startDate)}@study-lab`,
    `DTSTAMP:${compactDate(startDate)}T000000Z`,
    `DTSTART:${compactDate(startDate)}T${compactTime(reminderTime)}00`,
    `RRULE:FREQ=DAILY;UNTIL=${compactDate(examDate)}T235900`,
    'SUMMARY:英语四级今日训练',
    'DESCRIPTION:先复习旧词和错题，再学习新词并完成今日训练。',
    `URL:${escapeIcs(studyUrl)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:开始今天的英语四级训练',
    'TRIGGER:-PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.join('\r\n')}\r\n`;
}

export function downloadStudyCalendar(options: StudyCalendarOptions) {
  const url = URL.createObjectURL(new Blob([buildStudyCalendar(options)], { type: 'text/calendar;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'cet4-daily-study.ics';
  anchor.click();
  URL.revokeObjectURL(url);
}
