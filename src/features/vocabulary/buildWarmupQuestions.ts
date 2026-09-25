import type { CatalogQuestion, ObjectiveQuestion, VocabularyEntry } from '../../domain/content';

const optionId = (index: number) => String.fromCharCode(65 + index);

export function buildWarmupQuestions(warmedWords: VocabularyEntry[], vocabulary: VocabularyEntry[]): Array<CatalogQuestion & ObjectiveQuestion> {
  return warmedWords.map((word, index) => {
    const distractors = vocabulary
      .filter((candidate) => candidate.id !== word.id && candidate.meaningZh !== word.meaningZh)
      .map((candidate) => candidate.meaningZh)
      .filter((meaning, position, meanings) => meanings.indexOf(meaning) === position)
      .slice(index, index + 3);
    if (distractors.length < 3) {
      for (const candidate of vocabulary) {
        if (distractors.length >= 3) break;
        if (candidate.id !== word.id && candidate.meaningZh !== word.meaningZh && !distractors.includes(candidate.meaningZh)) distractors.push(candidate.meaningZh);
      }
    }
    const answerPosition = index % Math.min(4, distractors.length + 1);
    const choices = [...distractors.slice(0, answerPosition), word.meaningZh, ...distractors.slice(answerPosition)];
    return {
      id: `${word.id}:warmup`, version: 1, type: 'vocabulary', difficulty: 'foundation',
      prompt: `请选择 ${word.word} 的正确含义。`, knowledgePointIds: [`vocabulary:${word.id}`],
      explanationZh: `${word.word} ${word.partOfSpeech} ${word.meaningZh}${word.example ? `。例句：${word.example}` : ''}`,
      sourceNote: '依据本轮词汇热身生成的掌握检查', groupId: word.id,
      options: choices.map((text, optionIndex) => ({ id: optionId(optionIndex), text })),
      correctAnswer: optionId(answerPosition),
    };
  });
}
