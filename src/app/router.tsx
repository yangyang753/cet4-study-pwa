import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { TodayPage } from '../features/dashboard/TodayPage';
import { ExerciseRunner } from '../features/practice/ExerciseRunner';
import { ListeningPage } from '../features/listening/ListeningPage';
import { ReviewPage } from '../features/review/ReviewPage';
import { PrintPage } from '../features/print/PrintPage';
import { ExamSession } from '../features/exam/ExamSession';

function Placeholder({ title }: { title: string }) {
  return <section><h1>{title}</h1><p>模块正在准备中。</p></section>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <main><h1>页面暂时无法显示</h1><a href="/today">返回今日学习</a></main>,
    children: [
      { index: true, element: <Navigate replace to="/today" /> },
      { path: 'today', element: <TodayPage /> },
      { path: 'listen', element: <ListeningPage /> },
      { path: 'practice', element: <ExerciseRunner setId="set-starter" /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'print', element: <PrintPage /> },
      { path: 'exam', element: <ExamSession /> },
    ],
  },
]);
