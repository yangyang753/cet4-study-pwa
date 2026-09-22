import { Suspense, lazy } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { TodayPage } from '../features/dashboard/TodayPage';
import { ExerciseRunner } from '../features/practice/ExerciseRunner';
import { ListeningPage } from '../features/listening/ListeningPage';
import { ReviewPage } from '../features/review/ReviewPage';
import { ExamSession } from '../features/exam/ExamSession';
import { AccountPage } from '../features/auth/AccountPage';
import { supabaseClient } from '../lib/runtime';
const KnowledgePage = lazy(() => import('../features/knowledge/KnowledgePage').then((module) => ({ default: module.KnowledgePage })));
const PrintPage = lazy(() => import('../features/print/PrintPage').then((module) => ({ default: module.PrintPage })));
const basename = import.meta.env.BASE_URL === '/' ? '/' : import.meta.env.BASE_URL.replace(/\/$/, '');

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <main><h1>页面暂时无法显示</h1><a href={`${import.meta.env.BASE_URL}today`}>返回今日学习</a></main>,
    children: [
      { index: true, element: <Navigate replace to="/today" /> },
      { path: 'today', element: <TodayPage /> },
      { path: 'listen', element: <ListeningPage /> },
      { path: 'practice', element: <ExerciseRunner setId="set-starter" /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'print', element: <Suspense fallback={<p>正在生成 A4 练习册…</p>}><PrintPage /></Suspense> },
      { path: 'exam', element: <ExamSession /> },
      { path: 'knowledge', element: <Suspense fallback={<p>正在加载高频知识库…</p>}><KnowledgePage /></Suspense> },
      { path: 'account', element: <AccountPage cloudConfigured={Boolean(supabaseClient)} /> },
    ],
  },
], { basename });
