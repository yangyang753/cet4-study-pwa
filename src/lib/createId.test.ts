import { describe, expect, it } from 'vitest';
import { createId } from './createId';

describe('createId', () => {
  it('uses the browser UUID implementation when available', () => {
    expect(createId({ randomUUID: () => 'native-id' })).toBe('native-id');
  });

  it('creates distinct fallback ids when an older browser has no randomUUID', () => {
    const first = createId({}, () => 1_700_000_000_000, () => 0.25);
    const second = createId({}, () => 1_700_000_000_000, () => 0.25);
    expect(first).toMatch(/^local-/);
    expect(second).not.toBe(first);
  });
});
