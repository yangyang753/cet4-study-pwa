import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PwaInstallHelp } from './PwaInstallHelp';

describe('PwaInstallHelp', () => {
  it('shows browser-neutral add-to-home-screen instructions by default', () => {
    render(<PwaInstallHelp />);
    expect(screen.getByRole('heading', { name: '安装到手机桌面' })).toBeVisible();
    expect(screen.getByText(/点 Safari 的“分享”/)).toBeVisible();
    expect(screen.getByText(/打开浏览器菜单/)).toBeVisible();
  });

  it('uses the native install prompt when the browser provides it', async () => {
    const user = userEvent.setup();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    event.prompt = prompt;
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    render(<PwaInstallHelp />);

    fireEvent(window, event);
    await user.click(await screen.findByRole('button', { name: '安装应用' }));

    expect(prompt).toHaveBeenCalledOnce();
    expect(await screen.findByText('安装请求已发送')).toBeVisible();
  });
});
