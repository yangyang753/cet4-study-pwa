import rawVocabulary from '../../content/v1/vocabulary.json';
import type { VocabularyEntry } from '../domain/content';

const reviewedCorrections: Record<string, Partial<VocabularyEntry>> = {
  v0001: {
    partOfSpeech: 'n.',
    meaningZh: '文章，段落；通道，通路',
    example: 'Read the passage carefully before answering the questions.',
    exampleZh: '回答问题前请仔细阅读这篇文章。',
  },
  v0030: {
    partOfSpeech: 'a./ad.',
    meaningZh: '长的；长时间的，长期地',
    example: 'It did not take long to finish the reading task.',
    exampleZh: '完成这项阅读任务没有花很长时间。',
  },
};

const isSyntheticMetaExample = (example: string) => /\bis presented as\b/i.test(example);

function contextualExample(entry: VocabularyEntry): Pick<VocabularyEntry, 'example' | 'exampleZh'> {
  const part = entry.partOfSpeech.toLowerCase();
  const meaning = entry.meaningZh.replace(/^(?:n|v|vt|vi|a|ad|adj|adv|prep|pron|num|conj|aux)\.?/i, '').replace(/[;；].*$/, '').trim();
  const targetMeaning = meaning || entry.meaningZh;
  const seed = [...`${entry.id}:${entry.category ?? ''}`].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const choose = (templates: Array<(word: string, meaningZh: string) => Pick<VocabularyEntry, 'example' | 'exampleZh'>>) => templates[seed % templates.length](entry.word, targetMeaning);
  if (/^(?:n\.|n\/|n$)/.test(part)) return choose([
    (word, zh) => ({ example: `The article discusses ${word} in relation to everyday choices.`, exampleZh: `文章联系日常选择讨论了“${zh}”。` }),
    (word, zh) => ({ example: `Researchers examined how ${word} affects students on campus.`, exampleZh: `研究人员考察了“${zh}”如何影响校园里的学生。` }),
    (word, zh) => ({ example: `The report highlights the importance of ${word} in modern society.`, exampleZh: `报告强调了“${zh}”在现代社会中的重要性。` }),
    (word, zh) => ({ example: `During the discussion, ${word} became a central concern.`, exampleZh: `讨论中，“${zh}”成为核心关注点。` }),
    (word, zh) => ({ example: `The survey asked students about ${word} in their daily lives.`, exampleZh: `调查询问了学生日常生活中的“${zh}”。` }),
    (word, zh) => ({ example: `Teachers used a real case to explain ${word} in context.`, exampleZh: `老师用真实案例在语境中解释“${zh}”。` }),
  ]);
  if (/^(?:v|vt|vi)/.test(part)) return choose([
    (word, zh) => ({ example: `Students may ${word} more confidently after regular practice.`, exampleZh: `经常练习后，学生能更自信地完成“${zh}”这一动作。` }),
    (word, zh) => ({ example: `The project asks volunteers to ${word} before Friday.`, exampleZh: `项目要求志愿者在周五前完成“${zh}”。` }),
    (word, zh) => ({ example: `Regular feedback helps learners ${word} with fewer mistakes.`, exampleZh: `定期反馈帮助学习者更少出错地“${zh}”。` }),
    (word, zh) => ({ example: `The guide explains how to ${word} in a practical situation.`, exampleZh: `指南解释了如何在实际情境中“${zh}”。` }),
    (word, zh) => ({ example: `Group members decided to ${word} after comparing the options.`, exampleZh: `小组成员比较选项后决定“${zh}”。` }),
    (word, zh) => ({ example: `People often ${word} when circumstances begin to change.`, exampleZh: `情况开始变化时，人们常会“${zh}”。` }),
  ]);
  if (/^(?:a\.|adj)/.test(part)) return choose([
    (word, zh) => ({ example: `The result seemed ${word} after the group examined the evidence.`, exampleZh: `小组检查证据后，结果显得“${zh}”。` }),
    (word, zh) => ({ example: `Students described the new learning method as ${word}.`, exampleZh: `学生把这种新学习方法描述为“${zh}”。` }),
    (word, zh) => ({ example: `A ${word} response can change the direction of the discussion.`, exampleZh: `一个“${zh}”的回应可能改变讨论方向。` }),
    (word, zh) => ({ example: `The difference became ${word} when the figures were compared.`, exampleZh: `对比数据后，差异变得“${zh}”。` }),
    (word, zh) => ({ example: `The committee considered the proposal ${word} for the community.`, exampleZh: `委员会认为该提案对社区而言“${zh}”。` }),
    (word, zh) => ({ example: `It was ${word} to review the evidence before making a decision.`, exampleZh: `作决定前审查证据是“${zh}”的。` }),
  ]);
  if (/^(?:ad\.|adv)/.test(part)) return choose([
    (word, zh) => ({ example: `The team responded ${word} when the schedule changed.`, exampleZh: `日程变化时，团队以“${zh}”的方式回应。` }),
    (word, zh) => ({ example: `The speaker explained the main point ${word} during the interview.`, exampleZh: `采访中，说话者以“${zh}”的方式解释要点。` }),
    (word, zh) => ({ example: `Students worked ${word} to finish the shared task.`, exampleZh: `学生以“${zh}”的方式完成共同任务。` }),
    (word, zh) => ({ example: `The situation changed ${word} after the announcement.`, exampleZh: `通知发布后，情况以“${zh}”的方式发生变化。` }),
    (word, zh) => ({ example: `The report was ${word} discussed in the following meeting.`, exampleZh: `这份报告在后续会议中被“${zh}”地讨论。` }),
    (word, zh) => ({ example: `The instructions were followed ${word} throughout the activity.`, exampleZh: `整个活动中，大家以“${zh}”的方式遵循说明。` }),
  ]);
  return choose([
    (word, zh) => ({ example: `In this passage, "${word}" helps connect two important ideas.`, exampleZh: `在这篇文章中，“${word}”用于连接重要含义“${zh}”。` }),
    (word, zh) => ({ example: `The lecturer used "${word}" while explaining the main point.`, exampleZh: `讲师解释要点时使用了“${word}”，含义是“${zh}”。` }),
    (word, zh) => ({ example: `Learners noticed "${word}" in a sentence about campus life.`, exampleZh: `学习者在校园生活语境中注意到“${word}”，其含义是“${zh}”。` }),
    (word, zh) => ({ example: `The context makes the meaning of "${word}" easier to remember.`, exampleZh: `语境让“${word}”所表达的“${zh}”更容易记忆。` }),
    (word, zh) => ({ example: `A question in the lesson includes "${word}" as a key signal.`, exampleZh: `课程中的题目把“${word}”作为表达“${zh}”的关键信号。` }),
    (word, zh) => ({ example: `Readers used the surrounding details to understand "${word}".`, exampleZh: `读者利用上下文理解“${word}”所表达的“${zh}”。` }),
  ]);
}

export function qualityVocabularyEntry(entry: VocabularyEntry): VocabularyEntry {
  const corrected = { ...entry, ...reviewedCorrections[entry.id] };
  if (!isSyntheticMetaExample(corrected.example) && corrected.example.trim()) return corrected;
  return { ...corrected, ...contextualExample(corrected) };
}

export const learningVocabulary: VocabularyEntry[] = (rawVocabulary as VocabularyEntry[]).map(qualityVocabularyEntry);

export function auditLearningVocabulary(entries: VocabularyEntry[]): string[] {
  const errors: string[] = [];
  for (const entry of entries) {
    if (isSyntheticMetaExample(entry.example)) errors.push(`${entry.id}: synthetic meta example is visible`);
    if (!entry.example.trim()) errors.push(`${entry.id}: example is missing`);
    if (!entry.example.toLowerCase().includes(entry.word.toLowerCase())) errors.push(`${entry.id}: example does not contain target word`);
  }
  const passage = entries.find((entry) => entry.id === 'v0001');
  if (!passage?.meaningZh.includes('文章')) errors.push('v0001: missing common reading sense');
  const long = entries.find((entry) => entry.id === 'v0030');
  if (!long?.meaningZh.includes('长的')) errors.push('v0030: missing common adjective sense');
  return errors;
}
