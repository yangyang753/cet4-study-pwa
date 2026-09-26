import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backupFreshness, DataManagement } from './DataManagement';

describe('DataManagement', () => {
  beforeEach(() => localStorage.clear());

  it('classifies backups older than seven days as stale', () => {
    expect(backupFreshness('', new Date('2026-09-26T00:00:00Z')).status).toBe('never');
    expect(backupFreshness('2026-09-20T00:00:00Z', new Date('2026-09-26T00:00:00Z')).status).toBe('fresh');
    expect(backupFreshness('2026-09-18T00:00:00Z', new Date('2026-09-26T00:00:00Z'))).toMatchObject({ status: 'stale', ageDays: 8 });
  });

  it('shows a stale backup warning on devices without cloud sync', () => {
    localStorage.setItem('cet4:last-backup-at', '2026-09-18T00:00:00.000Z');
    render(<DataManagement now={() => new Date('2026-09-26T00:00:00.000Z')} actions={{ exportData: vi.fn(), importData: vi.fn(), clearData: vi.fn() }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('8 天前');
  });
  it('explains the manual transfer fallback in device order', () => {
    render(<DataManagement actions={{ exportData: vi.fn(), importData: vi.fn(), clearData: vi.fn() }} />);
    expect(screen.getByText(/旧设备导出 JSON.*新设备导入 JSON/)).toBeVisible();
  });

  it('requires the exact confirmation phrase before clearing local data', async () => {
    const clear = vi.fn().mockResolvedValue(undefined);
    render(<DataManagement actions={{ exportData: vi.fn(), importData: vi.fn(), clearData: clear }} />);
    const button = screen.getByRole('button', { name: '清空本机数据' });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText('清空确认'), '清空本机数据');
    await userEvent.click(button);
    expect(clear).toHaveBeenCalledTimes(1);
  });
});
