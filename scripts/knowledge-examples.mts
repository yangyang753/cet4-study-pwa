interface VocabularySource { word: string; partOfSpeech: string; meaningZh: string }

const cleanMeaning = (meaning: string) => meaning.replace(/^(?:n|v|vt|vi|a|adj|ad|adv|prep|pron|num|conj)\.?/i, '').split(/[;；]/)[0].trim();
const capitalized = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function buildVocabularyExample(entry: VocabularySource, index: number) {
  const part = entry.partOfSpeech.toLowerCase();
  const contexts = ['a campus survey', 'a class discussion', 'the library report', 'a volunteer project'];
  const context = contexts[index % contexts.length];
  let example: string;
  if (/^(?:v|vt|vi)/.test(part)) example = `Students can ${entry.word} new ideas while working on ${context}.`;
  else if (/^(?:a|adj)/.test(part)) example = `The new study plan is ${entry.word} for students working on ${context}.`;
  else if (/^(?:ad|adv)/.test(part)) example = `The team worked ${entry.word} while preparing ${context}.`;
  else if (/^n/.test(part)) example = `The report discusses ${entry.word} in the context of ${context}.`;
  else example = `In ${context}, “${entry.word}” helps explain an important detail.`;
  return { example, exampleZh: `记忆提示：${entry.word} 在此处表示“${cleanMeaning(entry.meaningZh) || entry.meaningZh}”。` };
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

export function buildCollocationExample(phrase: string, index: number) {
  const direct = connectorObject[phrase];
  if (direct) return { example: direct, exampleZh: `记忆提示：${phrase} 表示“在句中连接原因、结果或例子”。` };
  const completed = phrase
    .replace('somebody', 'new learners').replace('something', 'useful resources')
    .replace('doing', 'reviewing difficult material').replace(/ do$/, ' study regularly')
    .replace(/ of$/, ' success').replace(/ on$/, ' the main task').replace(/ in$/, ' campus activities')
    .replace(/ to$/, ' improve their skills').replace(/ with$/, ' the result').replace(/ from$/, ' the old method');
  const lead = /^(in|on|at|for|from|by|to|with|apart|regardless)\b/.test(phrase)
    ? `${capitalized(completed)}, the student team made steady progress.`
    : `College students can ${completed} during a practical campus project.`;
  return { example: lead, exampleZh: `记忆提示：把 “${phrase}” 作为一个整体记忆，并注意后面的介词或动词形式。` };
}
