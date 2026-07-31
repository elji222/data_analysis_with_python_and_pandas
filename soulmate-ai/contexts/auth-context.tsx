import { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import {
  clearCachedAccess,
  readCachedAccess,
  writeCachedAccess,
} from '@/lib/access/access-cache';
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
    await clearCachedAccess();
    await clearPendingInviteCode();
    await authSignOut();
  }, []);

  const verifyAccess = useCallback(
    async (accessToken: string, userId: string, { blocking }: { blocking: boolean }) => {
      if (blocking) {
        setIsAccessLoading(true);
      }
      setAccessError(null);

      try {
        const pendingInviteCode = await getPendingInviteCode();
        const status = await ensureAccessForSession(accessToken, pendingInviteCode);
        setAccessStatus(status);

        if (!status.hasAccess) {
          setAccessError('An invite code is required to join Soulmate AI.');
          await signOut();
          return;
        }

        await writeCachedAccess(userId, status);
        await clearPendingInviteCode();
      } catch (error) {
        // A cached grant means the user is already inside the app; a failed
        // background re-check (usually a flaky network) must not eject them.
        if (!blocking) {
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Could not verify your invite access.';
        setAccessError(message);
        setAccessStatus(null);
        await signOut();
      } finally {
        if (blocking) {
          setIsAccessLoading(false);
        }
      }
    },
    [signOut]
  );

  const refreshAccess = useCallback(async () => {
    if (!session?.access_token || !session.user?.id) {
      setAccessStatus(null);
      setAccessError(null);
      return;
    }

    await verifyAccess(session.access_token, session.user.id, { blocking: true });
  }, [session?.access_token, session?.user?.id, verifyAccess]);

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
    const accessToken = session?.access_token;
    const userId = session?.user?.id;

    if (!accessToken || !userId) {
      setAccessStatus(null);
      setAccessError(null);
      setIsAccessLoading(false);
      return;
    }

    let cancelled = false;

    // Set synchronously so the router does not treat the not-yet-checked state
    // as "no access" and bounce back to the login screen.
    setIsAccessLoading(true);

    async function checkAccess() {
      const cached = await readCachedAccess(userId!);
      if (cancelled) return;

      if (cached) {
        // Open the app right away and confirm with the server in the background.
        setAccessStatus(cached);
        setIsAccessLoading(false);
        void verifyAccess(accessToken!, userId!, { blocking: false });
        return;
      }

      await verifyAccess(accessToken!, userId!, { blocking: true });
    }

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, session?.user?.id, verifyAccess]);

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
