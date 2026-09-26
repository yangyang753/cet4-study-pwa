import { useState } from 'react';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { normalizeUserSettings, type ExamReadinessState, type UserSettings } from '../../domain/learning';
import { daysUntil } from '../planner/planDay';

const checklist: Array<{ key: keyof ExamReadinessState; label: string }> = [
  { key: 'registrationConfirmed', label: '报名信息已确认' },
  { key: 'paymentConfirmed', label: '报名缴费已完成' },
  { key: 'admissionTicketPrepared', label: '准考证已准备' },
  { key: 'equipmentPrepared', label: '考试用品已准备' },
];

export function ExamReadiness({ settings, today, repository }: { settings: UserSettings; today: string; repository: LearningRepository }) {
  const normalized = normalizeUserSettings(settings);
  const [readiness, setReadiness] = useState<ExamReadinessState>(normalized.readiness!);
  const [error, setError] = useState('');
  const remaining = daysUntil(today, normalized.examDate);
  const preparationReminder = remaining <= 3
    ? '进入考前 3 天：打印准考证，备好耳机/电池、2B 铅笔和身份证件。'
    : remaining <= 14
      ? '进入考前 14 天：确认报名信息，准备准考证并检查考试用品。'
      : '提前完成考试准备，冲刺阶段就能专注练习。';
  const registrationDays = normalized.registrationDeadline
    ? Math.ceil((Date.parse(`${normalized.registrationDeadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
    : null;
  const registrationReminder = !readiness.registrationConfirmed
    ? registrationDays === null
      ? '四六级报名由学校安排：请现在查看本校教务通知并填写报名截止日期。'
      : registrationDays < 0
        ? `本校报名截止日期已过 ${Math.abs(registrationDays)} 天，请立即联系学校确认是否报名成功。`
        : `距本校报名截止还有 ${registrationDays} 天，请尽快确认报名。`
    : !readiness.paymentConfirmed
      ? '报名信息已确认，请尽快完成缴费并核对报名状态。'
      : '';

  async function toggle(key: keyof ExamReadinessState) {
    const previous = readiness;
    const next = { ...readiness, [key]: !readiness[key] };
    setReadiness(next);
    setError('');
    try {
      await repository.saveUserSettings({ ...normalized, readiness: next, updatedAt: new Date().toISOString() });
    } catch {
      setReadiness(previous);
      setError('准备清单保存失败，请重试。');
    }
  }

  return <aside className="exam-readiness" aria-labelledby="readiness-title">
    <h2 id="readiness-title">考试准备</h2>
    {registrationReminder && <p role="alert">{registrationReminder}</p>}
    <p>{preparationReminder}</p>
    <p><a href="https://cet-kw.neea.edu.cn/Index" target="_blank" rel="noreferrer">打开 CET 官方报名入口</a>（具体截止时间以学校通知为准）</p>
    <div>{checklist.map((item) => <label key={item.key}><input type="checkbox" checked={readiness[item.key]} onChange={() => void toggle(item.key)} />{item.label}</label>)}</div>
    {error && <p role="alert">{error}</p>}
  </aside>;
}
