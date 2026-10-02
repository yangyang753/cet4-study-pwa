import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PronounceButton } from './PronounceButton';

describe('PronounceButton', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('speaks the word with an English voice request', async () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak, cancel, getVoices: () => [] });
    class Utterance { text: string; lang = ''; rate = 1; constructor(text: string) { this.text = text; } }
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    render(<PronounceButton text="passage" />);
    await userEvent.click(screen.getByRole('button', { name: '播放 passage 发音' }));
    expect(cancel).toHaveBeenCalledOnce();
    expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'passage', lang: 'en-US', rate: 0.85 }));
  });

  it('keeps the page usable and explains unsupported speech', async () => {
    vi.stubGlobal('speechSynthesis', undefined);
    vi.stubGlobal('SpeechSynthesisUtterance', undefined);
    render(<PronounceButton text="passage" />);
    await userEvent.click(screen.getByRole('button', { name: '播放 passage 发音' }));
    expect(screen.getByRole('status')).toHaveTextContent('当前浏览器不支持单词发音');
  });
});
