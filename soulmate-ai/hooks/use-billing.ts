import { useCallback, useEffect, useState } from 'react';

import { fetchBillingStatus } from '@/services/billing-api';
import type { BillingStatus } from '@/types/billing';

export function useBilling(accessToken: string | null | undefined) {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(accessToken));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setStatus(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextStatus = await fetchBillingStatus(accessToken);
      setStatus(nextStatus);
    } catch (refreshError) {
      const message =
        refreshError instanceof Error ? refreshError.message : 'Could not load billing status.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    status,
    isLoading,
    error,
    refresh,
  };
}
