import { fileURLToPath } from 'node:url';
import path from 'node:path';

export type RuntimeMode = 'offline' | 'cloud';
export function determineRuntimeMode(environment: Record<string, string | undefined>): RuntimeMode {
  const url = environment.VITE_SUPABASE_URL?.trim();
  const key = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (Boolean(url) !== Boolean(key)) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be provided together.');
  if (key && !key.startsWith('sb_publishable_')) throw new Error('Use a Supabase Publishable Key beginning with sb_publishable_.');
  return url && key ? 'cloud' : 'offline';
}

export function describeRuntimeConfiguration(environment: Record<string, string | undefined>): string {
  const mode = determineRuntimeMode(environment);
  if (mode === 'cloud') return 'Runtime configuration verified: cloud mode. Cross-device sync is enabled.';
  return 'Runtime configuration verified: offline mode. Learning data stays on this device; add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY together to enable cross-device sync.';
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  try { console.log(describeRuntimeConfiguration(process.env)); }
  catch (error) { console.error(error instanceof Error ? error.message : error); process.exit(1); }
}
