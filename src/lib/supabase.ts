import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthService, AuthUser } from '../features/auth/AuthProvider';

export function createConfiguredSupabaseClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key) : null;
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
    async resetPassword(email) { const { error } = await client.auth.resetPasswordForEmail(email); if (error) throw error; },
    subscribe(callback) {
      const { data } = client.auth.onAuthStateChange((_event, session) => { void callback(toUser(session?.user ?? null)); });
      return () => data.subscription.unsubscribe();
    },
  };
}
