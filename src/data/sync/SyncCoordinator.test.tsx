import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AuthService } from '../../features/auth/AuthProvider';
import { AuthProvider } from '../../features/auth/AuthProvider';
import type { LearningRepository } from '../repositories/LearningRepository';
import type { PendingOperation, SyncRemote } from './SyncEngine';
import { SyncCoordinator } from './SyncCoordinator';
import { SyncStatus } from '../../components/SyncStatus';

const signedOut: AuthService = { getUser: async () => null, signIn: async () => null, signUp: async () => null, signOut: async () => undefined, resetPassword: async () => undefined, subscribe: () => () => undefined };

describe('SyncCoordinator', () => {
  it('shows explicit local-only state when cloud sync is unavailable', async () => {
    const repository = { list: vi.fn().mockResolvedValue([]) } as unknown as LearningRepository;
    render(<AuthProvider service={signedOut}><SyncCoordinator client={null} repository={repository}><SyncStatus /></SyncCoordinator></AuthProvider>);
    expect(await screen.findByText('仅保存在本机')).toBeVisible();
  });

  it('shows the pending count while an authenticated learner is offline', async () => {
    const operation: PendingOperation = { id: 'op-1', entityId: 'a-1', kind: 'attempt', payload: {}, createdAt: '2026-09-23T00:00:00Z', attempts: 0 };
    const repository = { list: vi.fn().mockResolvedValue([operation]) } as unknown as LearningRepository;
    const service: AuthService = { ...signedOut, getUser: async () => ({ id: 'user-1', email: 'learner@example.com' }) };
    const remote = {} as SyncRemote;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(<AuthProvider service={service}><SyncCoordinator client={null} repository={repository} remoteFactory={() => remote}><SyncStatus /></SyncCoordinator></AuthProvider>);
    expect(await screen.findByText('1 条记录等待同步')).toBeVisible();
  });
});
