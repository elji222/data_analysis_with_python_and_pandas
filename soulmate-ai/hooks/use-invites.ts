import { useCallback, useEffect, useState } from 'react';

import { createInvite, fetchAccessStatus } from '@/services/access-api';
import type { AccessStatus } from '@/types/access';

export function useInvites(accessToken: string | null | undefined) {
  const [status, setStatus] = useState<AccessStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setStatus(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextStatus = await fetchAccessStatus(accessToken);
      setStatus(nextStatus);
    } catch (refreshError) {
      const message =
        refreshError instanceof Error ? refreshError.message : 'Could not load invites.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createInviteCode = useCallback(async () => {
    if (!accessToken) {
      throw new Error('Sign in to create invites.');
    }

    const result = await createInvite(accessToken);
    setStatus({
      hasAccess: true,
      isAdmin: result.isAdmin,
      invitesRemaining: result.invitesRemaining,
      invites: result.invites,
    });
    return result.invite;
  }, [accessToken]);

  return {
    status,
    isLoading,
    error,
    refresh,
    createInviteCode,
  };
}
