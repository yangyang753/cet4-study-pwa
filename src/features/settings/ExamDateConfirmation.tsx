import { useState } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { UserSettings } from '../../domain/learning';
import { appHref } from '../../lib/appHref';

function displayDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return `${year} 年 ${month} 月 ${day} 日`;
}

export function ExamDateConfirmation({ settings, repository, onConfirmed }: { settings: UserSettings; repository: LearningRepository; onConfirmed: (settings: UserSettings) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (settings.examDateConfirmedAt) return null;
  async function confirm() {
    const next = { ...settings, examDateConfirmedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setSaving(true);
    setError('');
    try { await repository.saveUserSettings(next); onConfirmed(next); }
    catch { setError('确认信息保存失败，请稍后重试。'); setSaving(false); }
  }
  return <aside className="exam-date-confirmation" aria-labelledby="exam-date-confirmation-title">
    <div><span>考试安排核对</span><h2 id="exam-date-confirmation-title">请确认本校考试日期</h2><p>当前计划按 <b>{displayDate(settings.examDate)}</b> 安排。四六级具体场次由学校通知，请先核对教务处或报名信息。</p></div>
    <div><a href={appHref('account')}>修改考试日期</a><button disabled={saving} onClick={() => void confirm()}>{saving ? '正在保存…' : '日期正确，确认'}</button></div>
    {error && <p role="alert">{error}</p>}
  </aside>;
}
