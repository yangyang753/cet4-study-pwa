import { useEffect, useState } from 'react';
import { DexieLearningRepository } from '../data/repositories/DexieLearningRepository';
import type { LearningRepository } from '../data/repositories/LearningRepository';

const reminderStorageKey = 'cet4:last-study-reminder';
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function isStudyReminderDue(now: Date, reminderTime: string, lastShownDate: string) {
  if (!/^\d{2}:\d{2}$/.test(reminderTime) || lastShownDate === dateKey(now)) return false;
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return current >= reminderTime;
}

const defaultRepository = new DexieLearningRepository();

export function StudyReminder({ repository = defaultRepository, now = () => new Date() }: { repository?: LearningRepository; now?: () => Date }) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    let timer = 0;
    const check = async () => {
      try {
        const snapshot = await repository.getDashboardSnapshot();
        const current = now();
        if (!active || !isStudyReminderDue(current, snapshot.settings.reminderTime ?? '', localStorage.getItem(reminderStorageKey) ?? '')) return;
        const currentDate = dateKey(current);
        localStorage.setItem(reminderStorageKey, currentDate);
        const copy = `今天的 ${snapshot.settings.dailyMinutes} 分钟训练还没有开始。`;
        setMessage(copy);
        if ('Notification' in window && Notification.permission === 'granted') new Notification('四级向前', { body: copy });
      } catch {
        // Reminders are optional and never block the app when storage is unavailable.
      }
    };
    void check();
    timer = window.setInterval(() => void check(), 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [now, repository]);

  if (!message) return null;
  return <aside className="study-reminder" role="status"><span>{message}</span><a href={`${import.meta.env.BASE_URL}today`}>开始学习</a><button aria-label="关闭学习提醒" onClick={() => setMessage('')}>×</button></aside>;
}
