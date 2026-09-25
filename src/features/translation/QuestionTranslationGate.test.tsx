import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LearningRepository } from '../../data/repositories/LearningRepository';
import type { ObjectiveQuestion, VocabularyEntry } from '../../domain/content';
import { QuestionTranslationGate, questionNeedsTranslation } from './QuestionTranslationGate';

const question: ObjectiveQuestion = {
  id: 'q1', version: 1, type: 'reading', difficulty: 'foundation',
  prompt: 'When is the activity available?', knowledgePointIds: [], explanationZh: '', sourceNote: '',
  options: [{ id: 'A', text: 'Sunday afternoon' }, { id: 'B', text: 'Monday morning' }], correctAnswer: 'A',
};
const words: VocabularyEntry[] = [
  { id: 'v-activity', word: 'activity', phonetic: '', partOfSpeech: 'n.', meaningZh: 'n.活动', example: '', derivatives: [], confusables: [] },
  { id: 'v-available', word: 'available', phonetic: '', partOfSpeech: 'a.', meaningZh: 'a.有空的', example: '', derivatives: [], confusables: [] },
];

function repository(overrides = {}) {
  return {
    getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [] }),
    upsertKnowledgeState: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as LearningRepository;
}

async function fillGate(stem = '这个活动什么时候进行？') {
  await userEvent.type(screen.getByRole('textbox', { name: '题干中文翻译' }), stem);
  await userEvent.type(screen.getByRole('textbox', { name: '选项 A 中文翻译' }), '星期天下午');
  await userEvent.type(screen.getByRole('textbox', { name: '选项 B 中文翻译' }), '星期一早上');
}

describe('QuestionTranslationGate', () => {
  it('does not require a translation gate for an entirely Chinese question', () => {
    expect(questionNeedsTranslation({ ...question, prompt: '请选择正确答案。', options: [{ id: 'A', text: '选项一' }] })).toBe(false);
    expect(questionNeedsTranslation({ ...question, prompt: '请选择正确答案。', options: [{ id: 'A', text: 'prep.在…里面n.内部' }] })).toBe(false);
    expect(questionNeedsTranslation(question)).toBe(true);
  });

  it('requires a translation for the stem and every English option', async () => {
    const onUnlocked = vi.fn();
    render(<QuestionTranslationGate question={question} repository={repository()} vocabulary={words} onUnlocked={onUnlocked} />);
    await userEvent.click(await screen.findByRole('button', { name: '检查翻译并解锁选项' }));
    expect(screen.getByRole('alert')).toHaveTextContent('请先填写题干和所有英文选项的中文翻译');
    expect(onUnlocked).not.toHaveBeenCalled();
  });

  it('saves missed words for review, preserves favorite, and unlocks answering', async () => {
    const onUnlocked = vi.fn();
    const learningRepository = repository({ getDashboardSnapshot: vi.fn().mockResolvedValue({ knowledgeStates: [
      { id: 'knowledge:v-available', itemId: 'v-available', status: 'mastered', favorite: true, updatedAt: '2026-09-24T00:00:00.000Z' },
    ] }) });
    render(<QuestionTranslationGate question={question} repository={learningRepository} vocabulary={words} onUnlocked={onUnlocked} />);
    await fillGate('什么时候进行？');
    await userEvent.click(await screen.findByRole('button', { name: '检查翻译并解锁选项' }));

    expect(await screen.findByText('activity')).toBeVisible();
    expect(screen.getByText('available')).toBeVisible();
    expect(learningRepository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'v-available', status: 'review', favorite: true }));
    expect(onUnlocked).toHaveBeenCalledOnce();
  });

  it('waits for existing word state before saving so a favorite cannot be overwritten', async () => {
    let resolveSnapshot!: (value: { knowledgeStates: Array<{ id: string; itemId: string; status: 'mastered'; favorite: boolean; updatedAt: string }> }) => void;
    const snapshot = new Promise<{ knowledgeStates: Array<{ id: string; itemId: string; status: 'mastered'; favorite: boolean; updatedAt: string }> }>((resolve) => { resolveSnapshot = resolve; });
    const learningRepository = repository({ getDashboardSnapshot: vi.fn().mockReturnValue(snapshot) });
    render(<QuestionTranslationGate question={question} repository={learningRepository} vocabulary={words} onUnlocked={vi.fn()} />);

    await fillGate('什么时候进行？');
    expect(screen.getByRole('button', { name: '正在读取单词状态…' })).toBeDisabled();

    resolveSnapshot({ knowledgeStates: [
      { id: 'knowledge:v-available', itemId: 'v-available', status: 'mastered', favorite: true, updatedAt: '2026-09-24T00:00:00.000Z' },
    ] });
    await userEvent.click(await screen.findByRole('button', { name: '检查翻译并解锁选项' }));

    expect(learningRepository.upsertKnowledgeState).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'v-available', favorite: true }));
  });

  it('keeps translations locked and retries after a storage failure', async () => {
    const onUnlocked = vi.fn();
    const save = vi.fn().mockRejectedValueOnce(new Error('storage')).mockResolvedValue(undefined);
    render(<QuestionTranslationGate question={question} repository={repository({ upsertKnowledgeState: save })} vocabulary={words} onUnlocked={onUnlocked} />);
    await fillGate('什么时候进行？');
    await userEvent.click(await screen.findByRole('button', { name: '检查翻译并解锁选项' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('错词保存失败');
    expect(screen.getByRole('textbox', { name: '题干中文翻译' })).toHaveValue('什么时候进行？');
    expect(onUnlocked).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: '重新保存并解锁' }));
    expect(onUnlocked).toHaveBeenCalledOnce();
  });
});
