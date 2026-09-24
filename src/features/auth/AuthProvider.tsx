import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

export interface AuthUser { id: string; email: string }
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthService {
  getUser(): Promise<AuthUser | null>;
  signIn(email: string, password: string): Promise<AuthUser | null>;
  signUp(email: string, password: string): Promise<AuthUser | null>;
  signOut(): Promise<void>;
  resetPassword(email: string, redirectTo: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  subscribe(callback: (user: AuthUser | null, event?: string) => void | Promise<void>): () => void;
}

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string, redirectTo: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  isRecoverySession: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const noopSessionExpired = async () => undefined;

export function AuthProvider({ children, service, onSessionExpired = noopSessionExpired }: PropsWithChildren<{ service: AuthService; onSessionExpired?: () => Promise<void> }>) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [isRecoverySession, setRecoverySession] = useState(false);

  useEffect(() => {
    let active = true;
    service.getUser().then((nextUser) => {
      if (!active) return;
      setUser(nextUser);
      setStatus(nextUser ? 'signedIn' : 'signedOut');
    }).catch(() => {
      if (!active) return;
      setUser(null);
      setStatus('signedOut');
    });
    const unsubscribe = service.subscribe(async (nextUser, event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoverySession(true);
      if (!nextUser) await onSessionExpired();
      if (!active) return;
      setUser(nextUser);
      setStatus(nextUser ? 'signedIn' : 'signedOut');
    });
    return () => { active = false; unsubscribe(); };
  }, [onSessionExpired, service]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    async signIn(email, password) {
      const nextUser = await service.signIn(email, password);
      setUser(nextUser);
      setStatus(nextUser ? 'signedIn' : 'signedOut');
    },
    async signUp(email, password) {
      const nextUser = await service.signUp(email, password);
      setUser(nextUser);
      setStatus(nextUser ? 'signedIn' : 'signedOut');
    },
    async signOut() { await service.signOut(); setUser(null); setStatus('signedOut'); setRecoverySession(false); },
    resetPassword: (email, redirectTo) => service.resetPassword(email, redirectTo),
    async updatePassword(password) { await service.updatePassword(password); setRecoverySession(false); },
    isRecoverySession,
  }), [isRecoverySession, service, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
