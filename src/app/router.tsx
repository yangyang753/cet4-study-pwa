import { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, createHashRouter, useParams } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { TodayPage } from '../features/dashboard/TodayPage';
import { supabaseClient } from '../lib/runtime';
import { appHref } from '../lib/appHref';
import { LegacyPathRedirect } from './LegacyPathRedirect';
const PracticeRoute = lazy(() => import('../features/practice/ExerciseRunner').then((module) => ({ default: module.PracticeRoute })));
const PracticeHub = lazy(() => import('../features/practice/PracticeHub').then((module) => ({ default: module.PracticeHub })));
const ListeningPage = lazy(() => import('../features/listening/ListeningPage').then((module) => ({ default: module.ListeningPage })));
const ReviewPage = lazy(() => import('../features/review/ReviewPage').then((module) => ({ default: module.ReviewPage })));
const ExamSession = lazy(() => import('../features/exam/ExamSession').then((module) => ({ default: module.ExamSession })));
const ExamPicker = lazy(() => import('../features/exam/ExamPicker').then((module) => ({ default: module.ExamPicker })));
const AccountPage = lazy(() => import('../features/auth/AccountPage').then((module) => ({ default: module.AccountPage })));
const MasteryRoute = lazy(() => import('../features/mastery/MasteryCheck').then((module) => ({ default: module.MasteryRoute })));
const DiagnosticPage = lazy(() => import('../features/diagnostic/DiagnosticPage').then((module) => ({ default: module.DiagnosticPage })));
const PasswordRecoveryPage = lazy(() => import('../features/auth/PasswordRecoveryPage').then((module) => ({ default: module.PasswordRecoveryPage })));
const KnowledgePage = lazy(() => import('../features/knowledge/KnowledgePage').then((module) => ({ default: module.KnowledgePage })));
const FoundationVocabularyPage = lazy(() => import('../features/vocabulary/FoundationVocabularyPage').then((module) => ({ default: module.FoundationVocabularyPage })));
const FoundationVocabularyPracticeRoute = lazy(() => import('../features/vocabulary/FoundationVocabularyPage').then((module) => ({ default: module.FoundationVocabularyPracticeRoute })));
const PrintPage = lazy(() => import('../features/print/PrintPage').then((module) => ({ default: module.PrintPage })));
const DailyCultureRoute = lazy(() => import('../features/translation/DailyCultureTask').then((module) => ({ default: module.DailyCultureRoute })));
const loading = (message: string, element: ReactNode) => <Suspense fallback={<p role="status">{message}</p>}>{element}</Suspense>;

export const router = createHashRouter([
  {
    path: '/',
    element: <><LegacyPathRedirect /><AppShell /></>,
    errorElement: <main><h1>页面暂时无法显示</h1><a href={appHref('today')}>返回今日学习</a></main>,
    children: [
      { index: true, element: <Navigate replace to="/today" /> },
      { path: 'today', element: <TodayPage /> },
      { path: 'listen', element: loading('正在加载听力训练…', <ListeningPage />) },
      { path: 'practice', element: loading('正在加载专项练习…', <PracticeHub />) },
      { path: 'practice/culture', element: loading('正在加载中国文化翻译…', <DailyCultureRoute />) },
      { path: 'practice/foundation-vocabulary', element: loading('正在加载基础必会词训练…', <FoundationVocabularyPracticeRoute />) },
      { path: 'practice/:kind', element: loading('正在加载练习题…', <PracticeRoute />) },
      { path: 'culture', element: <Navigate replace to="/practice/culture" /> },
      { path: 'review', element: loading('正在加载错题复习…', <ReviewPage />) },
      { path: 'review/foundation', element: loading('正在加载基础必会词错题复习…', <ReviewPage vocabularyLayer="foundation" />) },
      { path: 'mastery/:kind', element: loading('正在生成掌握检测…', <MasteryRoute />) },
      { path: 'diagnostic', element: loading('正在加载基础诊断…', <DiagnosticPage />) },
      { path: 'print', element: <Suspense fallback={<p>正在生成 A4 练习册…</p>}><PrintPage /></Suspense> },
      { path: 'exam', element: loading('正在加载模拟考试…', <ExamPicker />) },
      { path: 'exam/:mockId', element: <ExamRoute /> },
      { path: 'knowledge', element: <Suspense fallback={<p>正在加载高频知识库…</p>}><KnowledgePage /></Suspense> },
      { path: 'foundation-vocabulary', element: loading('正在加载基础必会词…', <FoundationVocabularyPage />) },
      { path: 'account', element: loading('正在加载账户信息…', <AccountPage cloudConfigured={Boolean(supabaseClient)} />) },
      { path: 'recover', element: loading('正在验证密码重置链接…', <PasswordRecoveryPage />) },
    ],
  },
]);

function ExamRoute() {
  const { mockId = 'mock-1' } = useParams();
  return loading('正在加载模拟考试…', <ExamSession mockId={mockId} />);
}
