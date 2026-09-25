interface VocabularySource { word: string; partOfSpeech: string; meaningZh: string }

const cleanMeaning = (meaning: string) => meaning.replace(/^(?:prep|pron|conj|adj|adv|num|vt|vi|ad|n|v|a)\.?/i, '').trim();
const partLabel = (part: string) => {
  const normalized = part.toLowerCase();
  if (/^(?:vt|vi|v)/.test(normalized)) return 'verb';
  if (/^(?:adj|a\.)/.test(normalized)) return 'adjective';
  if (/^(?:adv|ad\.)/.test(normalized)) return 'adverb';
  if (/^n/.test(normalized)) return 'noun';
  if (/^pron/.test(normalized)) return 'pronoun';
  if (/^prep/.test(normalized)) return 'preposition';
  if (/^num/.test(normalized)) return 'number word';
  return 'word';
};

export function buildVocabularyExample(entry: VocabularySource, index: number) {
  const part = entry.partOfSpeech.toLowerCase();
  const contexts = ['a campus survey', 'a class discussion', 'the library report', 'a volunteer project'];
  const context = contexts[index % contexts.length];
  const meaning = cleanMeaning(entry.meaningZh) || entry.meaningZh;
  const label = partLabel(part);
  const article = /^[aeiou]/.test(label) ? 'an' : 'a';
  const example = `In ${context}, “${entry.word}” is presented as ${article} ${label} meaning “${meaning}”.`;
  return { example, exampleZh: `记忆提示：${entry.word} 在此处表示“${meaning}”。` };
}

const connectorObject: Record<string, string> = {
  'according to': 'According to the campus survey, most students prefer shorter study sessions.',
  'because of': 'Because of careful planning, the group finished its work on time.',
  'due to': 'Due to heavy rain, the outdoor activity was moved indoors.',
  'thanks to': 'Thanks to regular practice, her listening skills improved steadily.',
  'instead of': 'Instead of memorizing isolated words, she learns them in context.',
  'rather than': 'Rather than waiting for motivation, he follows a simple daily plan.',
  'as a result': 'The library extended its opening hours; as a result, more students could study there.',
  'for example': 'Small habits can improve health; for example, students can walk after dinner.',
  'for instance': 'Digital tools can support learning; for instance, recordings make review easier.',
  'in fact': 'The task looked difficult; in fact, it took only ten minutes.',
};

const naturalCollocation: Record<string, string> = {
  'take part in': 'Many students take part in campus activities.',
  'play an important role in': 'Daily review plays an important role in language learning.',
  'make a difference': 'Small daily actions can make a difference in the local community.',
  'be responsible for': 'The student team is responsible for organizing the activity.',
  'provide somebody with something': 'The library provides new learners with useful resources.',
  'benefit from': 'Learners can benefit from regular practice.',
  'contribute to': 'A clear plan can contribute to better results.',
  'lead to': 'Regular review can lead to positive change.',
  'result in': 'Careful planning can result in higher efficiency.',
  'result from': 'Better results often result from careful planning.',
  'focus on': 'Learners should focus on the main task.',
  'depend on': 'The best method may depend on individual needs.',
  'deal with': 'The team learned how to deal with a difficult problem.',
  'cope with': 'Regular exercise can help students cope with study pressure.',
  'be aware of': 'Online learners should be aware of possible risks.',
  'be likely to': 'Students are likely to remember words learned in context.',
  'be willing to': 'Volunteers are willing to help other students.',
  'be able to': 'With practice, learners will be able to finish the task.',
  'be related to': 'The survey topic is related to student life.',
  'be different from': 'The new method is different from the old one.',
  'be similar to': 'This plan is similar to the previous one.',
  'be based on': 'A sound conclusion should be based on reliable evidence.',
  'be known for': 'The library is known for its excellent service.',
  'be famous for': 'The city is famous for its long history.',
  'be interested in': 'Many students are interested in environmental issues.',
  'be satisfied with': 'The team was satisfied with the final result.',
  'be concerned about': 'Parents are concerned about online safety.',
  'be involved in': 'Many volunteers are involved in community service.',
  'be exposed to': 'Readers are exposed to different viewpoints.',
  'be used to doing': 'She is used to studying at a fixed time.',
  'used to do': 'Many students used to study only before examinations.',
  'make use of': 'Learners should make use of library resources.',
  'take advantage of': 'Students can take advantage of online courses.',
  'pay attention to': 'Listeners should pay attention to key details.',
  'attach importance to': 'Successful learners attach importance to daily review.',
  'keep in mind': 'Please keep the main goal in mind.',
  'take into account': 'The plan should take individual needs into account.',
  'take measures to': 'Schools should take measures to protect personal information.',
  'make an effort to': 'Learners should make an effort to practise every day.',
  'spend time doing': 'She spends time reviewing difficult material.',
  'have access to': 'All students should have access to useful learning resources.',
  'have difficulty doing': 'Beginners may have difficulty understanding long passages.',
  'have an impact on': 'Sleep habits have an impact on study efficiency.',
  'have a positive effect on': 'Exercise has a positive effect on mental health.',
  'have no choice but to': 'The team had no choice but to change the schedule.',
};

export function buildCollocationExample(phrase: string) {
  const direct = connectorObject[phrase];
  if (direct) return { example: direct, exampleZh: `记忆提示：${phrase} 表示“在句中连接原因、结果或例子”。` };
  const completed = naturalCollocation[phrase];
  const lead = completed ?? `In a campus-life essay, “${phrase}” is a useful fixed expression for connecting or developing an idea.`;
  return { example: lead, exampleZh: `记忆提示：把 “${phrase}” 作为一个整体记忆，并注意后面的介词或动词形式。` };
}
