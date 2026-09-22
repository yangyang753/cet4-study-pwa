import { createConfiguredSupabaseClient, createOfflineAuthService, createSupabaseAuthService } from './supabase';

export const supabaseClient = createConfiguredSupabaseClient();
export const authService = supabaseClient ? createSupabaseAuthService(supabaseClient) : createOfflineAuthService();
