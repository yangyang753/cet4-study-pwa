import { describe, expect, it } from 'vitest';
import { determineRuntimeMode } from './verify-runtime-config.mts';

describe('runtime configuration', () => {
  it('accepts complete offline and cloud modes but rejects partial credentials', () => {
    expect(determineRuntimeMode({})).toBe('offline');
    expect(determineRuntimeMode({ VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public' })).toBe('cloud');
    expect(() => determineRuntimeMode({ VITE_SUPABASE_URL: 'https://project.supabase.co' })).toThrow('provided together');
    expect(() => determineRuntimeMode({ VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'service_role_secret' })).toThrow('Publishable Key');
  });
});
