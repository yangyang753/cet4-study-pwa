# Account Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the forgot-password flow from email request through setting a new password inside the deployed application.

**Architecture:** Extend the authentication service with redirect-aware reset and password update methods, then add a dedicated recovery route that validates Supabase’s recovery session. Keep the offline service explicit and non-functional for account actions.

**Tech Stack:** React 19, React Router 7, Supabase Auth, Vitest, Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-09-24-cet4-cloud-adaptive-completion-design.md`

## Global Constraints

- Recovery callbacks must work under the GitHub Pages base path `/cet4-study-pwa/`.
- Passwords are never logged, persisted in Dexie, or included in URLs.
- Invalid, expired, and already-used links must offer a path back to request another email.
- The browser uses only the Supabase Publishable Key.

## Review Focus

- A recovery event must not be treated as an ordinary signed-in navigation before the new password is set.
- Password and confirmation mismatch must be rejected before calling Supabase.
- A weak password must show a stable Chinese validation message.
- Direct navigation to recovery without a session must not crash.
- The redirect URL must include the current deployment base exactly once.

---

### Task 1: Extend the authentication service contract

**Files:**
- Modify: `src/features/auth/AuthProvider.tsx`
- Modify: `src/features/auth/AuthProvider.test.tsx`
- Modify: `src/lib/supabase.ts`
- Create: `src/lib/supabase.test.ts`
- Modify: `src/features/auth/LoginPage.tsx`
- Modify: `src/features/auth/LoginPage.test.tsx`

**Interfaces:**
- Changes: `resetPassword(email: string, redirectTo: string): Promise<void>`
- Adds: `updatePassword(password: string): Promise<void>`
- Adds: `AuthStatus` recovery signal through `isRecoverySession: boolean`

- [ ] **Step 1: Write failing service tests**

```ts
await service.resetPassword('learner@example.com', 'https://yangyang753.github.io/cet4-study-pwa/recover');
expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith('learner@example.com', { redirectTo: 'https://yangyang753.github.io/cet4-study-pwa/recover' });
await service.updatePassword('new-password-123');
expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'new-password-123' });
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm test --run src/lib/supabase.test.ts src/features/auth/AuthProvider.test.tsx src/features/auth/LoginPage.test.tsx`

Expected: FAIL because redirect and update methods do not exist.

- [ ] **Step 3: Implement the service and provider changes**

Map Supabase `PASSWORD_RECOVERY` auth events to `isRecoverySession = true`. Clear the flag after successful update or sign-out. The offline service throws `Cloud sync is not configured` for both methods.

- [ ] **Step 4: Generate the callback safely**

In `LoginPage`, build `new URL(`${import.meta.env.BASE_URL}recover`, window.location.origin).toString()` and pass it to `resetPassword`. Assert the deployed base path is not duplicated.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm test --run src/lib/supabase.test.ts src/features/auth`

Expected: PASS.

```bash
git add src/lib/supabase.ts src/lib/supabase.test.ts src/features/auth
git commit -m "feat: support password recovery sessions"
```

### Task 2: Add the new-password page and production callback test

**Files:**
- Create: `src/features/auth/PasswordRecoveryPage.tsx`
- Create: `src/features/auth/PasswordRecoveryPage.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/features/auth/auth.css`
- Create: `tests/password-recovery.spec.ts`

**Interfaces:**
- Consumes: `useAuth().isRecoverySession`
- Consumes: `useAuth().updatePassword(password)`

- [ ] **Step 1: Write failing form tests**

Assert direct access without a recovery session shows “链接无效或已过期”; mismatched passwords never call `updatePassword`; passwords shorter than 8 characters are rejected; a valid matching password calls update once and shows success.

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm test --run src/features/auth/PasswordRecoveryPage.test.tsx`

Expected: FAIL because the page is absent.

- [ ] **Step 3: Implement accessible recovery UI**

Use labelled `new-password` inputs, an alert region, disabled submit while saving, and links to `/account`. On success, clear both input fields and navigate to account after displaying confirmation.

- [ ] **Step 4: Register the route and callback fallback**

Add `recover` under the existing app shell. Confirm `dist/404.html` remains generated so GitHub Pages returns the SPA for the callback path.

- [ ] **Step 5: Add an E2E callback test**

Use a mocked auth service for the deterministic route test. In the real Supabase verification stage, send one email to the dedicated test account, open the recovery link manually, set a temporary password, then restore the test password without exposing either in logs.

- [ ] **Step 6: Run tests and commit**

Run: `pnpm test --run src/features/auth && pnpm e2e tests/password-recovery.spec.ts && pnpm pages:verify`

Expected: PASS.

```bash
git add src/features/auth src/app/router.tsx tests/password-recovery.spec.ts
git commit -m "feat: finish in-app password recovery"
```

