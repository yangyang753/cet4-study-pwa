import { describe, expect, it } from 'vitest';
import { appHref, legacyPathToHash } from './appHref';

describe('appHref', () => {
  it('creates canonical Hash URLs for application routes', () => {
    expect(appHref('today')).toBe('/#/today');
    expect(appHref('/review')).toBe('/#/review');
    expect(appHref('practice/vocabulary', '?from=today')).toBe('/#/practice/vocabulary?from=today');
  });

  it('migrates legacy repository paths without dropping their query', () => {
    expect(legacyPathToHash('/cet4-study-pwa/review', '?source=reminder', '/cet4-study-pwa/')).toBe('/cet4-study-pwa/#/review?source=reminder');
  });

  it('leaves root and existing Hash URLs unchanged', () => {
    expect(legacyPathToHash('/cet4-study-pwa/', '', '/cet4-study-pwa/')).toBeNull();
    expect(legacyPathToHash('/cet4-study-pwa/', '', '/cet4-study-pwa/', '#/today')).toBeNull();
  });
});
