import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, type AuthService } from './AuthProvider';
import { LoginPage } from './LoginPage';

function authService(): AuthService {
  return {
    getUser: vi.fn().mockResolvedValue(null),
    signIn: vi.fn().mockResolvedValue(null),
    signUp: vi.fn().mockResolvedValue(null),
    signOut: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    subscribe: () => () => undefined,
  };
}

describe('LoginPage', () => {
  it('sends a password reset email for a valid address', async () => {
    const user = userEvent.setup();
    const service = authService();
    render(<AuthProvider service={service}><LoginPage /></AuthProvider>);

    await user.type(screen.getByRole('textbox', { name: '邮箱' }), 'learner@example.com');
    await user.click(screen.getByRole('button', { name: '忘记密码' }));

    expect(service.resetPassword).toHaveBeenCalledWith('learner@example.com', 'http://localhost:3000/recover');
    expect(await screen.findByText('重置邮件已发送，请检查收件箱。')).toBeVisible();
  });
});
