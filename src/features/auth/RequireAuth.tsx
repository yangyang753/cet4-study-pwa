import type { PropsWithChildren } from 'react';
import { useAuth } from './AuthProvider';

export function RequireAuth({ children }: PropsWithChildren) {
  const { status } = useAuth();
  if (status === 'loading') return <p role="status">正在恢复登录状态…</p>;
  if (status === 'signedOut') return <section><h1>请先登录</h1><p>登录后可在电脑和手机间同步学习进度。</p></section>;
  return children;
}
