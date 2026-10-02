import { useEffect, useMemo, useState } from 'react';
import collocationData from '../../../content/v1/collocations.json';
import { DexieLearningRepository } from '../../data/repositories/DexieLearningRepository';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { DashboardSnapshot } from '../../domain/learning';
import { studyDate } from '../../lib/studyDate';
import { completeDailyTask } from '../mastery/taskProgress';
import { CollocationCheck } from './CollocationCheck';
import { selectDailyCollocations, type CollocationEntry } from './collocationPractice';

const defaultRepository = new DexieLearningRepository();

export function DailyCollocationTask({ repository = defaultRepository, today = studyDate(), random = Math.random }: {
  repository?: LearningRepository;
  today?: string;
  random?: () => number;
}) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void repository.getDashboardSnapshot().then((value) => { if (active) setSnapshot(value); }).catch(() => { if (active) setError('重点搭配学习记录读取失败，请刷新后重试。'); });
    return () => { active = false; };
  }, [repository]);
  const entries = useMemo(() => selectDailyCollocations(collocationData as CollocationEntry[], snapshot?.knowledgeStates ?? [], `${today}T23:59:59.999Z`, 3), [snapshot, today]);
  if (error) return <p role="alert">{error}</p>;
  if (!snapshot) return <p role="status">正在准备今日重点搭配…</p>;
  const alreadyCompleted = snapshot.completions.some((item) => item.taskId === `${today}:collocation`);
  if (finished || alreadyCompleted) return <section className="practice-summary"><h1>今日重点搭配已完成</h1><p>本轮全部采用挖空或互译输入，没有选择题。</p></section>;
  return <CollocationCheck repository={repository} entries={entries} states={snapshot.knowledgeStates} random={random} onComplete={async () => {
    const now = new Date().toISOString();
    const taskId = await completeDailyTask(repository, 'collocation', today);
    await repository.upsertKnowledgeState({ id: `mastery:${taskId}`, itemId: taskId, status: 'mastered', favorite: false, updatedAt: now });
    setFinished(true);
  }} />;
}
