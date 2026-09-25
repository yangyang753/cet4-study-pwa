import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataManagement } from './DataManagement';

describe('DataManagement', () => {
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
