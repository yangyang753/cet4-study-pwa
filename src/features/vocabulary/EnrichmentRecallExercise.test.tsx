import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { VocabularyEntry, VocabularyEnrichment } from '../../domain/content';
import { EnrichmentRecallExercise } from './EnrichmentRecallExercise';

const word: VocabularyEntry = {
  id: 'v1', word: 'develop', phonetic: '/dɪˈveləp/', partOfSpeech: 'v.', meaningZh: '发展；开发',
  example: 'Cities develop quickly.', exampleZh: '城市发展很快。', derivatives: [], confusables: [],
};
const enrichment: VocabularyEnrichment = {
  vocabularyId: 'v1',
  family: [{ word: 'development', partOfSpeech: 'n.', meaningZh: '发展；开发' }],
  confusables: [{ word: 'device', distinctionZh: 'develop 表示发展；device 表示设备。', example: 'This device is useful.' }],
};

describe('EnrichmentRecallExercise', () => {
  it('tests a family transformation without revealing the answer', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EnrichmentRecallExercise word={word} enrichment={enrichment} random={() => 0} onSubmit={onSubmit} />);
    expect(screen.getByText(/把 develop 改写成名词/)).toBeVisible();
    expect(screen.queryByText('development')).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: '词族答案' }), 'development');
    await userEvent.click(screen.getByRole('button', { name: '提交词族巩固' }));
    expect(onSubmit).toHaveBeenCalledWith({ correct: true, vocabularyId: 'v1', answer: 'development' });
  });

  it('uses one blank for a confusable contrast and reports only the source vocabulary id on failure', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EnrichmentRecallExercise word={word} enrichment={enrichment} random={() => 0.99} onSubmit={onSubmit} />);
    expect(screen.getByText('This _____ is useful.')).toBeVisible();
    expect(screen.queryByText('device')).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: '易混词答案' }), 'develop');
    await userEvent.click(screen.getByRole('button', { name: '提交易混词巩固' }));
    expect(onSubmit).toHaveBeenCalledWith({ correct: false, vocabularyId: 'v1', answer: 'develop' });
  });
});
