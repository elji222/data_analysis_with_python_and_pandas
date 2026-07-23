import { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { clearPendingInviteCode, getPendingInviteCode } from '@/lib/access/pending-invite';
import { completeWebAuthCallbackIfPresent, signOut as authSignOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { ensureAccessForSession } from '@/services/access-api';
import type { AccessStatus } from '@/types/access';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAccessLoading: boolean;
  accessStatus: AccessStatus | null;
  accessError: string | null;
  hasAccess: boolean;
  signOut: () => Promise<void>;
  refreshAccess: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  isLoading: true,
  isAccessLoading: false,
  accessStatus: null,
  accessError: null,
  hasAccess: false,
  signOut: async () => {},
  refreshAccess: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccessLoading, setIsAccessLoading] = useState(false);
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    setSession(null);
    setAccessStatus(null);
    setAccessError(null);
    setIsLoading(false);
    setIsAccessLoading(false);
    await clearPendingInviteCode();
    await authSignOut();
  }, []);

  const refreshAccess = useCallback(async () => {
    if (!session?.access_token) {
      setAccessStatus(null);
      setAccessError(null);
      return;
    }

    setIsAccessLoading(true);
    setAccessError(null);

    try {
      const pendingInviteCode = await getPendingInviteCode();
      const status = await ensureAccessForSession(session.access_token, pendingInviteCode);
      setAccessStatus(status);

      if (!status.hasAccess) {
        setAccessError('An invite code is required to join Soulmate AI.');
        await signOut();
        return;
      }

      await clearPendingInviteCode();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not verify your invite access.';
      setAccessError(message);
      setAccessStatus(null);
      await signOut();
    } finally {
      setIsAccessLoading(false);
    }
  }, [session?.access_token, signOut]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      try {
        if (Platform.OS === 'web') {
          await completeWebAuthCallbackIfPresent();
        }
      } catch (error) {
        console.error('Google sign-in callback failed:', error);
      }

      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        setSession(data.session);
        setIsLoading(false);
      }
    }

    void bootstrapAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setAccessStatus(null);
      setAccessError(null);
      setIsAccessLoading(false);
      return;
    }

    void refreshAccess();
  }, [session?.access_token, refreshAccess]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isAccessLoading,
      accessStatus,
      accessError,
      hasAccess: Boolean(accessStatus?.hasAccess),
      signOut,
      refreshAccess,
    }),
    [
      session,
      isLoading,
      isAccessLoading,
      accessStatus,
      accessError,
      signOut,
      refreshAccess,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
