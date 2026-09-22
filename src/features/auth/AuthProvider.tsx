import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

export interface AuthUser { id: string; email: string }
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthService {
  getUser(): Promise<AuthUser | null>;
  signIn(email: string, password: string): Promise<AuthUser | null>;
  signUp(email: string, password: string): Promise<AuthUser | null>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  subscribe(callback: (user: AuthUser | null) => void | Promise<void>): () => void;
}

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, service, onSessionExpired = async () => undefined }: PropsWithChildren<{ service: AuthService; onSessionExpired?: () => Promise<void> }>) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let active = true;
    service.getUser().then((nextUser) => {
      if (!active) return;
      setUser(nextUser);
      setStatus(nextUser ? 'signedIn' : 'signedOut');
    });
    const unsubscribe = service.subscribe(async (nextUser) => {
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
    async signOut() { await service.signOut(); setUser(null); setStatus('signedOut'); },
    resetPassword: (email) => service.resetPassword(email),
  }), [service, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
