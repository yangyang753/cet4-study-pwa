export interface RuntimeEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

export type RuntimeConfiguration =
  | { mode: 'offline' }
  | { mode: 'cloud'; url: string; publishableKey: string };

export function resolveRuntimeConfiguration(environment: RuntimeEnv): RuntimeConfiguration {
  const url = environment.VITE_SUPABASE_URL?.trim() ?? '';
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  if (Boolean(url) !== Boolean(publishableKey)) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be provided together.');
  if (!url && !publishableKey) return { mode: 'offline' };

  let parsed: URL;
  try { parsed = new URL(url); }
  catch { throw new Error('VITE_SUPABASE_URL must be a valid HTTP or HTTPS URL.'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) throw new Error('VITE_SUPABASE_URL must be a valid HTTP or HTTPS URL.');

  const normalizedKey = publishableKey.toLowerCase();
  if (normalizedKey.includes('service_role') || normalizedKey.startsWith('sb_secret_')) {
    throw new Error('Never expose a Supabase service-role or secret key in the browser. Use a Supabase Publishable Key beginning with sb_publishable_.');
  }
  if (!publishableKey.startsWith('sb_publishable_')) throw new Error('Use a Supabase Publishable Key beginning with sb_publishable_.');
  return { mode: 'cloud', url: parsed.toString().replace(/\/$/, ''), publishableKey };
}
