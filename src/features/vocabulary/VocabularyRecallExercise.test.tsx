import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { VocabularyEntry } from '../../domain/content';
import { buildWordReinforcement } from '../knowledge/wordReinforcement';
import { VocabularyRecallExercise } from './VocabularyRecallExercise';

const word: VocabularyEntry = {
  id: 'v1', word: 'passage', phonetic: "/'pæsɪdʒ/", partOfSpeech: 'n.',
  meaningZh: '文章，段落', example: 'Read the passage.', derivatives: [], confusables: [],
};

describe('VocabularyRecallExercise', () => {
  it('submits exact spelling without asking for a meaning', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<VocabularyRecallExercise exercise={buildWordReinforcement(word, () => 0.4)} onSubmit={onSubmit} />);

    expect(screen.getByText('文章，段落')).toBeVisible();
    expect(screen.queryByRole('textbox', { name: '中文释义答案' })).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: '英文答案' }), 'passage');
    await userEvent.click(screen.getByRole('button', { name: '提交词汇复习' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      answer: { english: 'passage', chinese: '' },
      grade: expect.objectContaining({ correct: true, spellingCorrect: true }),
    }));
  });

  it('reports every missing meaning in a meaning recall', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<VocabularyRecallExercise exercise={buildWordReinforcement(word, () => 0)} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByRole('textbox', { name: '中文释义答案' }), '文章');
    await userEvent.click(screen.getByRole('button', { name: '提交词汇复习' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      grade: expect.objectContaining({ correct: false, missingMeanings: ['段落'] }),
    }));
  });

  it('keeps both answers when persistence fails so the learner can retry', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('storage')).mockResolvedValueOnce(undefined);
    render(<VocabularyRecallExercise exercise={buildWordReinforcement(word, () => 0.99)} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByRole('textbox', { name: '英文答案' }), 'passage');
    await userEvent.type(screen.getByRole('textbox', { name: '中文释义答案' }), '文章，段落');
    await userEvent.click(screen.getByRole('button', { name: '提交词汇复习' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
    expect(screen.getByRole('textbox', { name: '英文答案' })).toHaveValue('passage');
    expect(screen.getByRole('textbox', { name: '中文释义答案' })).toHaveValue('文章，段落');

    await userEvent.click(screen.getByRole('button', { name: '重新保存词汇复习' }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('marks forgotten meaning and spelling fields according to the random format', async () => {
    const onForgotten = vi.fn().mockResolvedValue(undefined);
    render(<VocabularyRecallExercise exercise={buildWordReinforcement(word, () => 0.99)} onSubmit={vi.fn()} onForgotten={onForgotten} />);

    await userEvent.click(screen.getByRole('button', { name: '想不起来' }));
    expect(onForgotten).toHaveBeenCalledWith(expect.objectContaining({
      correct: false,
      spellingCorrect: false,
      missingMeanings: ['文章', '段落'],
    }));
  });
});
