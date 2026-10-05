import { useEffect, useState, type FormEvent } from 'react';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { normalizeUserSettings, type UserSettings } from '../../domain/learning';
import { reminderCapability } from '../../components/StudyReminder';
import { studyDate } from '../../lib/studyDate';
import { downloadStudyCalendar } from './studyCalendar';

const defaultRepository = new DexieLearningRepository();

export function LearningSettings({ repository = defaultRepository, configuredCloud = false }: { repository?: LearningRepository; configuredCloud?: boolean }) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [examDate, setExamDate] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState('60');
  const [playbackRate, setPlaybackRate] = useState('1');
  const [reminderTime, setReminderTime] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void repository.getDashboardSnapshot().then((snapshot) => {
      if (!active) return;
      const normalized = normalizeUserSettings(snapshot.settings);
      setSettings(normalized);
      setExamDate(normalized.examDate);
      setDailyMinutes(String(normalized.dailyMinutes));
      setPlaybackRate(String(normalized.playbackRate));
      setReminderTime(normalized.reminderTime ?? '');
      setRegistrationDeadline(normalized.registrationDeadline ?? '');
    }).catch(() => setError('读取学习设置失败，请刷新后重试。'));
    return () => { active = false; };
  }, [repository]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const minutes = Number(dailyMinutes);
    if (!Number.isInteger(minutes) || minutes < 20 || minutes > 180) {
      setError('每日学习时间需设置为 20 到 180 分钟。');
      setMessage('');
      return;
    }
    if (!examDate) {
      setError('请选择考试日期。');
      setMessage('');
      return;
    }
    const next = normalizeUserSettings({
      ...settings,
      examDate,
      examDateConfirmedAt: examDate === settings?.examDate ? settings?.examDateConfirmedAt : undefined,
      dailyMinutes: minutes,
      playbackRate: Number(playbackRate),
      reminderTime,
      registrationDeadline,
      updatedAt: new Date().toISOString(),
    });
    try {
      await repository.saveUserSettings(next);
      setSettings(next);
      setError('');
      setMessage('设置已保存');
    } catch {
      setError('保存失败，请稍后重试。');
      setMessage('');
    }
  }

  function exportCalendar() {
    if (!reminderTime || !examDate) return;
    try {
      const studyUrl = `${window.location.href.split('#')[0]}#/today`;
      downloadStudyCalendar({ startDate: studyDate(), examDate, reminderTime, studyUrl });
      setError('');
      setMessage('手机日历文件已导出，请打开文件并添加重复日程。');
    } catch {
      setError('日历导出失败，请先检查考试日期和提醒时间。');
      setMessage('');
    }
  }

  if (!settings && !error) return <p role="status">正在读取学习设置…</p>;
  const permission: NotificationPermission = typeof Notification === 'undefined' ? 'denied' : Notification.permission;
  const capability = reminderCapability(configuredCloud, permission);
  return <section className="account-card" aria-labelledby="learning-settings-title">
    <h2 id="learning-settings-title">学习设置</h2>
    <p>这些设置会同步影响今日计划、错题复习和听力播放。</p>
    <form noValidate onSubmit={(event) => void submit(event)}>
      <label>考试日期<input aria-label="考试日期" type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} /></label>
      <label>本校报名截止日期<input aria-label="本校报名截止日期" type="date" value={registrationDeadline} onChange={(event) => setRegistrationDeadline(event.target.value)} /></label>
      <p><small>四六级报名时间由学校安排，请按本校教务通知填写；不要只等全国统一提醒。</small></p>
      <label>每日学习分钟数<input aria-label="每日学习分钟数" type="number" min="20" max="180" value={dailyMinutes} onChange={(event) => setDailyMinutes(event.target.value)} /></label>
      <label>默认听力速度<select aria-label="默认听力速度" value={playbackRate} onChange={(event) => setPlaybackRate(event.target.value)}>{[0.75, 1, 1.25, 1.5].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}</select></label>
      <label>每日提醒时间<input aria-label="每日提醒时间" type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} /></label>
      <p><small>{capability.message} 留空表示关闭。</small></p>
      <p><small>导出到手机日历后，即使网页未打开，手机日历也可以按时提醒。</small></p>
      <button type="button" disabled={!reminderTime || !examDate} onClick={exportCalendar}>导出到手机日历</button>
      {'Notification' in window && Notification.permission === 'default' && <button type="button" onClick={() => void Notification.requestPermission().then((permission) => setMessage(permission === 'granted' ? '浏览器通知已开启' : '未开启浏览器通知，应用内提醒仍可使用'))}>开启浏览器通知</button>}
      <button type="submit">保存学习设置</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
