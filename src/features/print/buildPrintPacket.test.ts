import { describe, expect, it } from 'vitest';
import rawContent from '../../content/starter/content.json';
import { parseContentPack } from '../../content/schema';
import { buildPrintPacket } from './buildPrintPacket';

describe('buildPrintPacket', () => {
  it('separates questions from answers and adds subjective writing space', () => {
    const content = parseContentPack(rawContent);
    const packet = buildPrintPacket(content.questions);
    expect(packet.questionPages.every((page) => !page.blocks.some((block) => block.kind === 'answer'))).toBe(true);
    expect(packet.answerPages[0].blocks.some((block) => block.kind === 'answer')).toBe(true);
    expect(packet.questionPages.flatMap((page) => page.blocks).filter((block) => block.kind === 'writing-space')).toHaveLength(2);
  });
});
