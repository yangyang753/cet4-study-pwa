import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, type AuthService, useAuth } from './AuthProvider';
import { RequireAuth } from './RequireAuth';

function Probe() {
  const auth = useAuth();
  return <div><span>{auth.status}</span><span>{auth.user?.email ?? 'none'}</span></div>;
}

function serviceWith(user: { id: string; email: string } | null): AuthService {
  return {
    getUser: vi.fn().mockResolvedValue(user),
    signIn: vi.fn().mockResolvedValue(user),
    signUp: vi.fn().mockResolvedValue(user),
    signOut: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    subscribe: () => () => undefined,
  };
}

describe('AuthProvider', () => {
  it('restores an existing signed-in user', async () => {
    render(<AuthProvider service={serviceWith({ id: 'u-1', email: 'learner@example.com' })}><Probe /></AuthProvider>);
    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('signedIn')).toBeInTheDocument());
    expect(screen.getByText('learner@example.com')).toBeInTheDocument();
  });

  it('runs the expiry callback before exposing signed-out state', async () => {
    let listener: ((user: null) => void) | undefined;
    const order: string[] = [];
    const service = serviceWith({ id: 'u-1', email: 'learner@example.com' });
    service.subscribe = (callback) => { listener = callback; return () => undefined; };
    render(<AuthProvider service={service} onSessionExpired={async () => { order.push('saved'); }}><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('signedIn')).toBeInTheDocument());

    await act(async () => { await listener?.(null); });

    expect(order).toEqual(['saved']);
    expect(screen.getByText('signedOut')).toBeInTheDocument();
  });

  it('protects learning content when no user is signed in', async () => {
    render(<AuthProvider service={serviceWith(null)}><RequireAuth><h1>今日任务</h1></RequireAuth></AuthProvider>);
    await waitFor(() => expect(screen.getByRole('heading', { name: '请先登录' })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: '今日任务' })).not.toBeInTheDocument();
  });
});
