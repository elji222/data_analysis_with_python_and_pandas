import { getApiUrl } from '@/lib/api-origin';
import type { AdminUsageStats } from '@/types/admin-usage';

export async function fetchAdminUsageStats(accessToken: string): Promise<AdminUsageStats> {
  const response = await fetch(getApiUrl('/api/admin/usage'), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = (await response.json()) as AdminUsageStats & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? 'Could not load usage stats.');
  }

  return data;
}
