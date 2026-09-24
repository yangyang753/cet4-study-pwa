import { describe, expect, it } from 'vitest';
import { checkBundleBudget } from './check-bundle-budget.mts';

describe('bundle budget', () => {
  it('enforces entry and lazy asset limits while ignoring source maps', () => {
    expect(checkBundleBudget([{ path: 'entry.js', bytes: 512000, entry: true }])).toEqual([]);
    expect(checkBundleBudget([{ path: 'entry.js', bytes: 512001, entry: true }])).toContain('entry.js: 512001 bytes exceeds 512000');
    expect(checkBundleBudget([{ path: 'lazy.js', bytes: 800001, entry: false }])).toContain('lazy.js: 800001 bytes exceeds 800000');
    expect(checkBundleBudget([{ path: 'entry.js.map', bytes: 9999999, entry: true }])).toEqual([]);
  });
});
