import baseCultureTranslations from '../../content/v1/cultureTranslations.json';
import type { CultureTranslationPrompt } from '../features/translation/cultureTranslation';

const extensions = [
  {
    id: 'daily-life',
    theme: '当代生活',
    promptZh: '此外，这一传统至今仍在日常生活中发挥作用，并帮助年轻人理解中国社会。',
    referenceAnswer: 'In addition, this tradition still plays a role in daily life and helps young people understand Chinese society.',
    keyPoint: '当代作用',
  },
  {
    id: 'international',
    theme: '国际交流',
    promptZh: '随着国际交流增加，越来越多外国人开始了解这一文化传统及其背后的价值。',
    referenceAnswer: 'As international exchange grows, more foreigners are beginning to learn about this cultural tradition and the values behind it.',
    keyPoint: '国际传播',
  },
] as const;

const base = baseCultureTranslations as CultureTranslationPrompt[];

export const cultureTranslationBank: CultureTranslationPrompt[] = [
  ...base,
  ...extensions.flatMap((extension) => base.map((prompt) => ({
    ...prompt,
    id: `${prompt.id}-${extension.id}`,
    theme: `${prompt.theme} · ${extension.theme}`,
    promptZh: `${prompt.promptZh}${extension.promptZh}`,
    referenceAnswer: `${prompt.referenceAnswer} ${extension.referenceAnswer}`,
    keyPoints: [...prompt.keyPoints, extension.keyPoint],
  }))),
];
