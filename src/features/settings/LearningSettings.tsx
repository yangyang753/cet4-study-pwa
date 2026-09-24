import { useEffect, useState, type FormEvent } from 'react';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { normalizeUserSettings, type UserSettings } from '../../domain/learning';

const defaultRepository = new DexieLearningRepository();

export function LearningSettings({ repository = defaultRepository }: { repository?: LearningRepository }) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [examDate, setExamDate] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState('60');
  const [playbackRate, setPlaybackRate] = useState('1');
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
      dailyMinutes: minutes,
      playbackRate: Number(playbackRate),
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

  if (!settings && !error) return <p role="status">正在读取学习设置…</p>;
  return <section className="account-card" aria-labelledby="learning-settings-title">
    <h2 id="learning-settings-title">学习设置</h2>
    <p>这些设置会同步影响今日计划、错题复习和听力播放。</p>
    <form noValidate onSubmit={(event) => void submit(event)}>
      <label>考试日期<input aria-label="考试日期" type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} /></label>
      <label>每日学习分钟数<input aria-label="每日学习分钟数" type="number" min="20" max="180" value={dailyMinutes} onChange={(event) => setDailyMinutes(event.target.value)} /></label>
      <label>默认听力速度<select aria-label="默认听力速度" value={playbackRate} onChange={(event) => setPlaybackRate(event.target.value)}>{[0.75, 1, 1.25, 1.5].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}</select></label>
      <button type="submit">保存学习设置</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
