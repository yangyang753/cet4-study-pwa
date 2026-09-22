import { useEffect, useState } from 'react';
import { ExerciseRunner } from '../practice/ExerciseRunner';

export function ExamSession({ minutes = 25 }: { minutes?: number }) {
  const [seconds, setSeconds] = useState(minutes * 60);
  useEffect(() => { const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, []);
  if (seconds === 0) return <section><h1>本模块时间到</h1><p>答案已保存到本机，联网后会自动同步。</p></section>;
  return <section><p role="timer">剩余 {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</p><ExerciseRunner setId="set-starter" mode="exam" /></section>;
}
