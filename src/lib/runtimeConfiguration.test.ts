import { describe, expect, it } from 'vitest';
import { resolveRuntimeConfiguration } from './runtimeConfiguration';

describe('resolveRuntimeConfiguration', () => {
  it('uses offline mode when both cloud variables are absent', () => {
    expect(resolveRuntimeConfiguration({})).toEqual({ mode: 'offline' });
  });

  it('uses cloud mode only with a valid URL and publishable key', () => {
    expect(resolveRuntimeConfiguration({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public-test' })).toEqual({
      mode: 'cloud', url: 'https://example.supabase.co', publishableKey: 'sb_publishable_public-test',
    });
  });

  it.each([
    [{ VITE_SUPABASE_URL: 'https://example.supabase.co' }, /provided together/],
    [{ VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public-test' }, /provided together/],
    [{ VITE_SUPABASE_URL: 'not-a-url', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public-test' }, /valid HTTP/],
    [{ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'service_role_secret' }, /service-role/],
  ])('rejects unsafe or incomplete cloud configuration', (environment, message) => {
    expect(() => resolveRuntimeConfiguration(environment)).toThrow(message);
  });
});
