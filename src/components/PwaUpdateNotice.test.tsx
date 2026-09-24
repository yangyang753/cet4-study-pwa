import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const update = vi.fn().mockResolvedValue(undefined);
let needRefresh: (() => void) | undefined;
vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn((options: { onNeedRefresh(): void }) => { needRefresh = options.onNeedRefresh; return update; }),
}));

import { PwaUpdateNotice } from './PwaUpdateNotice';

describe('PwaUpdateNotice', () => {
  it('waits for the learner to approve a reload', async () => {
    const user = userEvent.setup();
    render(<PwaUpdateNotice />);
    needRefresh?.();
    expect(await screen.findByText('学习内容已有新版本')).toBeVisible();
    expect(update).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '立即更新' }));
    expect(update).toHaveBeenCalledWith(true);
  });

  it('allows the learner to postpone the update', async () => {
    const user = userEvent.setup();
    render(<PwaUpdateNotice />);
    needRefresh?.();
    await user.click(await screen.findByRole('button', { name: '稍后' }));
    expect(screen.queryByText('学习内容已有新版本')).not.toBeInTheDocument();
  });
});
