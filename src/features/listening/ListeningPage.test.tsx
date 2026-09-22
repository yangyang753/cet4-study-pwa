import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ListeningPage } from './ListeningPage';

describe('ListeningPage', () => {
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
