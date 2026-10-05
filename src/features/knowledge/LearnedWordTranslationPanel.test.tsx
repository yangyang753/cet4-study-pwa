import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { VocabularyEntry } from '../../domain/content';
import { LearnedWordTranslationPanel } from './LearnedWordTranslationPanel';

const learned: VocabularyEntry[] = [
  { id: 'culture', word: 'culture', meaningZh: '文化', example: 'Culture connects people.', exampleZh: '文化把人们联系在一起。', phonetic: '', partOfSpeech: '', derivatives: [], confusables: [] },
  { id: 'history', word: 'history', meaningZh: '历史', example: 'The city has a long history.', exampleZh: '这座城市有悠久的历史。', phonetic: '', partOfSpeech: '', derivatives: [], confusables: [] },
];

describe('LearnedWordTranslationPanel', () => {
  it('starts a one-word Chinese-culture prompt without revealing its English target', async () => {
    render(<LearnedWordTranslationPanel learnedWords={learned} random={() => 0} onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '开始单词短句' }));
    expect(screen.getByRole('heading', { name: '已学词短句中译英' })).toBeVisible();
    expect(screen.getByText('中国文化吸引了许多年轻人。')).toBeVisible();
    expect(screen.queryByText(/^culture$/i)).not.toBeInTheDocument();
  });

  it('requires two learned words before multi-word mode can start', async () => {
    const { rerender } = render(<LearnedWordTranslationPanel learnedWords={learned.slice(0, 1)} random={() => 0} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: '开始多词短句' })).toBeDisabled();
    rerender(<LearnedWordTranslationPanel learnedWords={learned} random={() => 0} onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '开始多词短句' }));
    expect(screen.getByText('中国文化有悠久的历史。')).toBeVisible();
  });

  it('submits a correct answer and shows the reference only after grading', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LearnedWordTranslationPanel learnedWords={learned} random={() => 0} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: '开始单词短句' }));
    expect(screen.queryByText(/Chinese culture attracts/)).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: '英文短句答案' }), 'Chinese culture attracts many young people.');
    await userEvent.click(screen.getByRole('button', { name: '提交中译英' }));
    expect(await screen.findByText(/本题通过/)).toBeVisible();
    expect(screen.getByText(/^参考表达：Chinese culture attracts many young people\.$/)).toBeVisible();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ attemptId: expect.any(String), grade: expect.objectContaining({ correct: true }) }));
  });

  it('keeps the answer and allows retry when persistence fails', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('storage blocked')).mockResolvedValueOnce(undefined);
    render(<LearnedWordTranslationPanel learnedWords={learned} random={() => 0} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: '开始单词短句' }));
    const answer = screen.getByRole('textbox', { name: '英文短句答案' });
    await userEvent.type(answer, 'Chinese culture attracts many young people.');
    await userEvent.click(screen.getByRole('button', { name: '提交中译英' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
    expect(answer).toHaveValue('Chinese culture attracts many young people.');
    await userEvent.click(screen.getByRole('button', { name: '重新保存中译英' }));
    expect(await screen.findByText(/本题通过/)).toBeVisible();
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});
