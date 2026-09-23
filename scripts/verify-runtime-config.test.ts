import { describe, expect, it } from 'vitest';
import { determineRuntimeMode } from './verify-runtime-config.mts';

describe('runtime configuration', () => {
  it('accepts complete offline and cloud modes but rejects partial credentials', () => {
    expect(determineRuntimeMode({})).toBe('offline');
    expect(determineRuntimeMode({ VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-key' })).toBe('cloud');
    expect(() => determineRuntimeMode({ VITE_SUPABASE_URL: 'https://project.supabase.co' })).toThrow('Both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  });
});
