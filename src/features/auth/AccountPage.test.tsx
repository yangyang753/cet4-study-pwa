import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import { AccountPage } from './AccountPage';
import { AuthProvider, type AuthService } from './AuthProvider';

const service: AuthService = {
  getUser: vi.fn().mockResolvedValue(null), signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(),
  resetPassword: vi.fn(), updatePassword: vi.fn(), subscribe: () => () => undefined,
};
const repository = {
  getDashboardSnapshot: vi.fn().mockResolvedValue({ settings: { examDate: '2026-12-12', dailyMinutes: 60, playbackRate: 1 } }),
  saveUserSettings: vi.fn().mockResolvedValue(undefined),
} as unknown as LearningRepository;

describe('AccountPage sync explanation', () => {
  it('clearly explains that local records do not automatically follow app updates or another device', async () => {
    render(<AuthProvider service={service}><AccountPage cloudConfigured={false} repository={repository} /></AuthProvider>);
    expect(await screen.findByText(/手机和电脑不会自动同步/)).toBeVisible();
    expect(screen.getByText(/网页版本更新也不会把学习记录同步/)).toBeVisible();
    expect(screen.getByText(/导出 JSON.*另一台设备.*导入 JSON/)).toBeVisible();
    expect(screen.getByText(/生产站点还没有配置云同步连接/)).toBeVisible();
  });

  it('does not show the local-only warning when cloud sync is configured', async () => {
    render(<AuthProvider service={service}><AccountPage cloudConfigured repository={repository} /></AuthProvider>);
    await screen.findByRole('heading', { name: '登录四级向前' });
    expect(screen.queryByText(/手机和电脑不会自动同步/)).not.toBeInTheDocument();
  });
});
