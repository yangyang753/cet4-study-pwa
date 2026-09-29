import { describe, expect, it } from 'vitest';
import { buildListeningCues, checkListeningCue } from './listeningFoundation';

describe('listening foundation cues', () => {
  it('builds unique high-frequency word gaps from transcript segments', () => {
    const cues = buildListeningCues(
      [{ text: 'Students should register early for the activity.' }, { text: 'The activity supports the local community.' }],
      [{ id: 'v1', word: 'activity', meaningZh: '活动' }, { id: 'v2', word: 'support', meaningZh: '支持' }],
    );
    expect(cues).toEqual(expect.arrayContaining([
      expect.objectContaining({ wordId: 'v1', answer: 'activity', sentence: expect.stringContaining('_____') }),
      expect.objectContaining({ wordId: 'v2', answer: 'supports', sentence: expect.stringContaining('_____') }),
    ]));
  });

  it('checks answers without case or surrounding-space sensitivity', () => {
    expect(checkListeningCue(' Activity ', 'activity')).toBe(true);
    expect(checkListeningCue('active', 'activity')).toBe(false);
  });
});
