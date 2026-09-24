import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAuthService } from './supabase';

describe('Supabase auth service', () => {
  it('sends a redirect-aware reset request and updates the recovered password', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    const updateUser = vi.fn().mockResolvedValue({ error: null });
    const client = { auth: { resetPasswordForEmail, updateUser } } as unknown as SupabaseClient;
    const service = createSupabaseAuthService(client);
    await service.resetPassword('learner@example.com', 'https://example.com/cet4-study-pwa/recover');
    await service.updatePassword('new-password-123');
    expect(resetPasswordForEmail).toHaveBeenCalledWith('learner@example.com', { redirectTo: 'https://example.com/cet4-study-pwa/recover' });
    expect(updateUser).toHaveBeenCalledWith({ password: 'new-password-123' });
  });
});
