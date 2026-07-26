import { getApiUrl } from '@/lib/api-origin';
import type { BillingStatus } from '@/types/billing';

async function billingRequest<T>(
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
    throw new Error(data.error ?? 'Billing request failed.');
  }

  return data;
}

export async function fetchBillingStatus(accessToken: string): Promise<BillingStatus> {
  return billingRequest<BillingStatus>('/api/billing/status', accessToken);
}

export async function startCheckout(accessToken: string): Promise<string> {
  const data = await billingRequest<{ url: string }>('/api/billing/checkout', accessToken, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return data.url;
}

export async function openBillingPortal(accessToken: string): Promise<string> {
  const data = await billingRequest<{ url: string }>('/api/billing/portal', accessToken, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return data.url;
}
