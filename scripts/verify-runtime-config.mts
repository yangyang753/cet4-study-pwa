import { fileURLToPath } from 'node:url';
import path from 'node:path';

export type RuntimeMode = 'offline' | 'cloud';
export function determineRuntimeMode(environment: Record<string, string | undefined>): RuntimeMode {
  const url = environment.VITE_SUPABASE_URL?.trim();
  const key = environment.VITE_SUPABASE_ANON_KEY?.trim();
  if (Boolean(url) !== Boolean(key)) throw new Error('Both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be provided together.');
  return url && key ? 'cloud' : 'offline';
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  try { console.log(`Runtime configuration verified: ${determineRuntimeMode(process.env)} mode.`); }
  catch (error) { console.error(error instanceof Error ? error.message : error); process.exit(1); }
}
