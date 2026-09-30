import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { resolveRuntimeConfiguration } from '../src/lib/runtimeConfiguration';

export type RuntimeMode = 'offline' | 'cloud';
export function determineRuntimeMode(environment: Record<string, string | undefined>): RuntimeMode {
  return resolveRuntimeConfiguration(environment).mode;
}

export function describeRuntimeConfiguration(environment: Record<string, string | undefined>): string {
  const mode = determineRuntimeMode(environment);
  if (mode === 'cloud') return 'Runtime configuration verified: cloud mode. Cross-device sync is enabled.';
  return 'Runtime configuration verified: offline mode. Learning data stays on this device; add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY together to enable cross-device sync.';
}

export function verifyRuntimeConfiguration(environment: Record<string, string | undefined>, requireCloud = false): string {
  const description = describeRuntimeConfiguration(environment);
  if (requireCloud && determineRuntimeMode(environment) !== 'cloud') {
    throw new Error('Cloud sync is required, but VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are not configured.');
  }
  return description;
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  const requireCloud = process.argv.includes('--require-cloud') || process.env.REQUIRE_CLOUD_SYNC?.toLowerCase() === 'true';
  try { console.log(verifyRuntimeConfiguration(process.env, requireCloud)); }
  catch (error) { console.error(error instanceof Error ? error.message : error); process.exit(1); }
}
