import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ListeningPage } from './ListeningPage';

describe('ListeningPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('resolves audio under the deployed application base path', () => {
    vi.stubEnv('BASE_URL', '/cet4-study-pwa/');
    const { container } = render(<ListeningPage />);
    expect(container.querySelector('audio')).toHaveAttribute('src', '/cet4-study-pwa/audio/v1/listen-01.wav');
  });

  it('moves through all 24 listening sets', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<ListeningPage />);
    expect(screen.getByText('第 1 / 24 套')).toBeInTheDocument();
    expect(screen.getByText(/校园志愿活动/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '下一套' }));
    expect(screen.getByText('第 2 / 24 套')).toBeInTheDocument();
    expect(screen.getByText(/图书馆服务/)).toBeInTheDocument();
  });

  it('reports buffering and ready states from the real media element', () => {
    const { container } = render(<ListeningPage />);
    const media = container.querySelector('audio')!;
    fireEvent.waiting(media);
    expect(screen.getByText('缓冲中…')).toBeInTheDocument();
    fireEvent.canPlay(media);
    expect(screen.getByText('可以播放')).toBeInTheDocument();
  });

  it('offers recovery when the browser rejects playback', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new DOMException('Not allowed', 'NotAllowedError'));
    const user = userEvent.setup();
    render(<ListeningPage />);
    await user.click(screen.getByRole('button', { name: '播放' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('浏览器未能开始播放');
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  });

  it('keeps the transcript hidden until the learner asks to see it', async () => {
    const user = userEvent.setup();
    render(<ListeningPage />);
    expect(screen.queryByText(/Saturday group is full/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '显示原文' }));
    expect(screen.getByText(/Saturday group is full/)).toBeInTheDocument();
  });

  it('preserves the selected answer and offers text mode after audio failure', async () => {
    const user = userEvent.setup();
    const { container } = render(<ListeningPage />);
    await user.click(screen.getByRole('radio', { name: /Sunday afternoon/ }));
    fireEvent.error(container.querySelector('audio')!);
    expect(screen.getByRole('radio', { name: /Sunday afternoon/ })).toBeChecked();
    expect(screen.getByRole('button', { name: '文本模式' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  });

  it('supports the approved playback rates', async () => {
    const user = userEvent.setup();
    render(<ListeningPage />);
    await user.selectOptions(screen.getByLabelText('播放速度'), '1.25');
    expect(screen.getByLabelText('播放速度')).toHaveValue('1.25');
  });
});
