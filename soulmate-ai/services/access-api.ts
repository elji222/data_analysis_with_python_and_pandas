import { getApiUrl } from '@/lib/api-origin';
import type { AccessStatus, InviteCode } from '@/types/access';

async function accessRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? 'Request failed.');
  }

  return data;
}

export async function fetchAccessStatus(accessToken: string): Promise<AccessStatus> {
  return accessRequest<AccessStatus>('/api/access', accessToken);
}

export async function bootstrapAccess(
  accessToken: string,
  inviteCode?: string | null
): Promise<AccessStatus> {
  return accessRequest<AccessStatus>('/api/access', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      action: 'bootstrap',
      code: inviteCode ?? undefined,
    }),
  });
}

export async function createInvite(accessToken: string): Promise<{
  invite: InviteCode;
  invitesRemaining: number;
  invites: InviteCode[];
  isAdmin: boolean;
  hasAccess: boolean;
}> {
  return accessRequest('/api/access', accessToken, {
    method: 'POST',
    body: JSON.stringify({ action: 'create-invite' }),
  });
}

export async function ensureAccessForSession(
  accessToken: string,
  inviteCode?: string | null
): Promise<AccessStatus> {
  return bootstrapAccess(accessToken, inviteCode);
}
