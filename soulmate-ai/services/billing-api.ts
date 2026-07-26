import { getApiUrl } from '@/lib/api-origin';
import type { BillingStatus } from '@/types/billing';

const BILLING_REQUEST_TIMEOUT_MS = 20_000;

async function readResponseBody(response: Response): Promise<{ error?: string }> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return (await response.json()) as { error?: string };
  }

  const text = (await response.text()).trim();
  if (!text) {
    return { error: `Billing request failed (${response.status}).` };
  }

  return { error: text.slice(0, 240) };
}

async function billingRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BILLING_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(getApiUrl(path), {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(init?.headers ?? {}),
      },
    });

    const data = (await readResponseBody(response)) as T & { error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? `Billing request failed (${response.status}).`);
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'Billing request timed out. Check that Stripe keys are in .env and run DEPLOY.cmd again.'
      );
    }

    if (error instanceof TypeError) {
      throw new Error('Could not reach the billing server. Try refreshing the page.');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchBillingStatus(accessToken: string): Promise<BillingStatus> {
  return billingRequest<BillingStatus>('/api/billing/status', accessToken);
}

export async function startCheckout(accessToken: string): Promise<string> {
  const data = await billingRequest<{ url: string }>('/api/billing/checkout', accessToken, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  if (!data.url) {
    throw new Error('Stripe did not return a checkout link.');
  }

  return data.url;
}

export async function openBillingPortal(accessToken: string): Promise<string> {
  const data = await billingRequest<{ url: string }>('/api/billing/portal', accessToken, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  if (!data.url) {
    throw new Error('Stripe did not return a billing portal link.');
  }

  return data.url;
}
