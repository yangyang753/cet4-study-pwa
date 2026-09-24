import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, type AuthService } from './AuthProvider';
import { PasswordRecoveryPage } from './PasswordRecoveryPage';

function service(recovery: boolean) {
  const updatePassword = vi.fn().mockResolvedValue(undefined);
  const value: AuthService = {
    getUser: async () => recovery ? ({ id: 'u1', email: 'learner@example.com' }) : null,
    signIn: async () => null, signUp: async () => null, signOut: async () => undefined,
    resetPassword: async () => undefined, updatePassword,
    subscribe(callback) { if (recovery) void callback({ id: 'u1', email: 'learner@example.com' }, 'PASSWORD_RECOVERY'); return () => undefined; },
  };
  return { value, updatePassword };
}

describe('PasswordRecoveryPage', () => {
  it('rejects direct access without a recovery session', async () => {
    const auth = service(false);
    render(<AuthProvider service={auth.value}><PasswordRecoveryPage /></AuthProvider>);
    expect(await screen.findByText('链接无效或已过期')).toBeVisible();
  });

  it('validates matching passwords before updating the account', async () => {
    const user = userEvent.setup();
    const auth = service(true);
    render(<AuthProvider service={auth.value}><PasswordRecoveryPage /></AuthProvider>);
    await user.type(await screen.findByLabelText('新密码'), 'new-password-123');
    await user.type(screen.getByLabelText('确认新密码'), 'different-password');
    await user.click(screen.getByRole('button', { name: '设置新密码' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('两次输入的密码不一致');
    expect(auth.updatePassword).not.toHaveBeenCalled();
  });

  it('updates a valid password and confirms success', async () => {
    const user = userEvent.setup();
    const auth = service(true);
    render(<AuthProvider service={auth.value}><PasswordRecoveryPage /></AuthProvider>);
    await user.type(await screen.findByLabelText('新密码'), 'new-password-123');
    await user.type(screen.getByLabelText('确认新密码'), 'new-password-123');
    await user.click(screen.getByRole('button', { name: '设置新密码' }));
    expect(auth.updatePassword).toHaveBeenCalledWith('new-password-123');
    expect(await screen.findByText('密码已更新')).toBeVisible();
  });
});
