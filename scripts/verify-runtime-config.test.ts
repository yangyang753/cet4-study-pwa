import { describe, expect, it } from 'vitest';
import { describeRuntimeConfiguration, determineRuntimeMode } from './verify-runtime-config.mts';

describe('runtime configuration', () => {
  it('accepts complete offline and cloud modes but rejects partial credentials', () => {
    expect(determineRuntimeMode({})).toBe('offline');
    expect(determineRuntimeMode({ VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public' })).toBe('cloud');
    expect(() => determineRuntimeMode({ VITE_SUPABASE_URL: 'https://project.supabase.co' })).toThrow('provided together');
    expect(() => determineRuntimeMode({ VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'service_role_secret' })).toThrow('Publishable Key');
  });

  it('reports cloud activation prerequisites without exposing credential values', () => {
    const offline = describeRuntimeConfiguration({});
    expect(offline).toContain('offline mode');
    expect(offline).toContain('VITE_SUPABASE_URL');
    expect(offline).toContain('VITE_SUPABASE_PUBLISHABLE_KEY');

    const cloud = describeRuntimeConfiguration({
      VITE_SUPABASE_URL: 'https://private-project.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_private-value',
    });
    expect(cloud).toContain('cloud mode');
    expect(cloud).not.toContain('private-project');
    expect(cloud).not.toContain('private-value');
  });
});
