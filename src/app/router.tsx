import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { TodayPage } from '../features/dashboard/TodayPage';
import { ExerciseRunner } from '../features/practice/ExerciseRunner';

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
      { path: 'listen', element: <Placeholder title="听力精练" /> },
      { path: 'practice', element: <ExerciseRunner setId="set-starter" /> },
      { path: 'review', element: <Placeholder title="错题复习" /> },
      { path: 'print', element: <Placeholder title="A4 打印中心" /> },
    ],
  },
]);
