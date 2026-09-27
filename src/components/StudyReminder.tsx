import { useEffect, useState } from 'react';
import { DexieLearningRepository } from '../data/repositories/DexieLearningRepository';
import type { LearningRepository } from '../data/repositories/LearningRepository';
import { appHref } from '../lib/appHref';

const reminderStorageKey = 'cet4:last-study-reminder';
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const previousDateKey = (date: Date) => {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return dateKey(previous);
};

export function isStudyReminderDue(now: Date, reminderTime: string, lastShownDate: string) {
  if (!/^\d{2}:\d{2}$/.test(reminderTime) || lastShownDate === dateKey(now)) return false;
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return current >= reminderTime;
}

export function reminderCapability(configuredCloud: boolean, notificationPermission: NotificationPermission) {
  if (!configuredCloud) return { background: false, message: '当前为本机模式：需要打开应用，系统才会检查学习提醒。' };
  if (notificationPermission === 'granted') return { background: false, message: '浏览器通知已允许，但站点没有后台推送服务；仍需打开应用才能按时检查提醒。' };
  return { background: false, message: '云同步不等于后台推送；需要打开应用才能检查提醒。' };
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
        const currentDate = dateKey(current);
        const alreadyStudied = snapshot.completions.some((completion) => completion.date === currentDate);
        const lastShownDate = localStorage.getItem(reminderStorageKey) ?? '';
        const missedYesterday = snapshot.completions.length > 0 && !snapshot.completions.some((completion) => completion.date === previousDateKey(current));
        const regularReminderDue = isStudyReminderDue(current, snapshot.settings.reminderTime ?? '', lastShownDate);
        if (!active || alreadyStudied || lastShownDate === currentDate || (!missedYesterday && !regularReminderDue)) return;
        localStorage.setItem(reminderStorageKey, currentDate);
        const copy = missedYesterday
          ? '昨天没有学习记录。今天先清旧词和错题，再继续新内容。'
          : `今天的 ${snapshot.settings.dailyMinutes} 分钟训练还没有开始。`;
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
  return <aside className="study-reminder" role="status"><span>{message}</span><a href={appHref('today')}>开始学习</a><button aria-label="关闭学习提醒" onClick={() => setMessage('')}>×</button></aside>;
}
