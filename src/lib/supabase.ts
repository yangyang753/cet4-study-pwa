import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthService, AuthUser } from '../features/auth/AuthProvider';
import { resolveRuntimeConfiguration, type RuntimeEnv } from './runtimeConfiguration';

export function createConfiguredSupabaseClient(environment: RuntimeEnv = import.meta.env): SupabaseClient | null {
  const configuration = resolveRuntimeConfiguration(environment);
  return configuration.mode === 'cloud' ? createClient(configuration.url, configuration.publishableKey) : null;
}

function toUser(user: { id: string; email?: string } | null): AuthUser | null {
  return user?.email ? { id: user.id, email: user.email } : null;
}

export function createSupabaseAuthService(client: SupabaseClient): AuthService {
  return {
    async getUser() { const { data, error } = await client.auth.getUser(); if (error) return null; return toUser(data.user); },
    async signIn(email, password) { const { data, error } = await client.auth.signInWithPassword({ email, password }); if (error) throw error; return toUser(data.user); },
    async signUp(email, password) { const { data, error } = await client.auth.signUp({ email, password }); if (error) throw error; return toUser(data.user); },
    async signOut() { const { error } = await client.auth.signOut(); if (error) throw error; },
    async resetPassword(email, redirectTo) { const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo }); if (error) throw error; },
    async updatePassword(password) { const { error } = await client.auth.updateUser({ password }); if (error) throw error; },
    subscribe(callback) {
      const { data } = client.auth.onAuthStateChange((event, session) => { void callback(toUser(session?.user ?? null), event); });
      return () => data.subscription.unsubscribe();
    },
  };
}

export function createOfflineAuthService(): AuthService {
  return {
    async getUser() { return null; },
    async signIn() { throw new Error('Cloud sync is not configured'); },
    async signUp() { throw new Error('Cloud sync is not configured'); },
    async signOut() { return undefined; },
    async resetPassword() { throw new Error('Cloud sync is not configured'); },
    async updatePassword() { throw new Error('Cloud sync is not configured'); },
    subscribe() { return () => undefined; },
  };
}
