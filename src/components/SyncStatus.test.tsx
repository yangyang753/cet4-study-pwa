import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SyncContext, type SyncContextValue } from '../data/sync/SyncContext';
import { SyncStatus } from './SyncStatus';

const renderState = (overrides: Partial<SyncContextValue>) => {
  const value: SyncContextValue = { state: 'local', pendingCount: 0, lastSyncedAt: null, lastError: null, retry: vi.fn(), ...overrides };
  render(<SyncContext.Provider value={value}><SyncStatus /></SyncContext.Provider>);
  return value;
};

describe('SyncStatus', () => {
  it('explains local-only ownership', () => {
    renderState({ state: 'local' });
    expect(screen.getByRole('status')).toHaveTextContent('仅保存在本机');
  });

  it('shows pending records and the last synchronization time', () => {
    renderState({ state: 'pending', pendingCount: 3 });
    expect(screen.getByRole('status')).toHaveTextContent('3 条记录等待同步');
    renderState({ state: 'synced', lastSyncedAt: '2026-09-27T08:30:00.000Z' });
    expect(screen.getAllByRole('status')[1]).toHaveTextContent('已同步');
  });

  it('offers a manual retry after a sync error', async () => {
    const user = userEvent.setup();
    const value = renderState({ state: 'error', lastError: '连接失败' });
    await user.click(screen.getByRole('button', { name: '重试' }));
    expect(value.retry).toHaveBeenCalledOnce();
  });
});
