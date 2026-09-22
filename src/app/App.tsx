import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { SyncCoordinator } from '../data/sync/SyncCoordinator';
import { authService, supabaseClient } from '../lib/runtime';
import { PwaUpdateNotice } from '../components/PwaUpdateNotice';

export function App() {
  return <AuthProvider service={authService}><SyncCoordinator client={supabaseClient}><RouterProvider router={router} /><PwaUpdateNotice /></SyncCoordinator></AuthProvider>;
}
