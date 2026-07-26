import type {
  StripeCheckoutSession,
  StripeSubscription,
  StripeWebhookEvent,
} from '@/types/stripe-api';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const STRIPE_REQUEST_TIMEOUT_MS = 10_000;

function validateStripeSecretKey(secretKey: string): string {
  const trimmed = secretKey.trim();

  if (trimmed.startsWith('sk-ant-')) {
    throw new Error(
      'STRIPE_SECRET_KEY is set to your Anthropic key. In .env use your Stripe secret key (sk_test_... or sk_live_...) from dashboard.stripe.com/apikeys, then run DEPLOY.cmd again.'
    );
  }

  if (!/^sk_(test|live)_/.test(trimmed) && !/^rk_(test|live)_/.test(trimmed)) {
    throw new Error(
      'STRIPE_SECRET_KEY does not look like a Stripe key. Use sk_test_... or sk_live_... from dashboard.stripe.com/apikeys.'
    );
  }

  return trimmed;
}

function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured on the server.');
  }
  return validateStripeSecretKey(secretKey);
}

function appendStripeParams(
  params: URLSearchParams,
  value: unknown,
  key: string
) {
  if (value === undefined || value === null) {
    return;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      appendStripeParams(params, childValue, `${key}[${childKey}]`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      appendStripeParams(params, item, `${key}[${index}]`);
    });
    return;
  }

  params.append(key, String(value));
}

function buildStripeParams(body: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    appendStripeParams(params, value, key);
  }
  return params;
}

async function stripeRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STRIPE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${STRIPE_API_BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${getStripeSecretKey()}`,
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: body ? buildStripeParams(body).toString() : undefined,
    });

    const payload = (await response.json()) as T & { error?: { message?: string } };
    if (!response.ok) {
      const stripeMessage = payload.error?.message ?? `Stripe request failed (${response.status}).`;
      if (/sk-ant-/i.test(stripeMessage)) {
        throw new Error(
          'Stripe rejected the server key because STRIPE_SECRET_KEY is set to an Anthropic key. Fix .env and run DEPLOY.cmd again.'
        );
      }
      throw new Error(stripeMessage);
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Stripe request timed out. Check your server network and Stripe keys.');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function isStripeConfigured(): boolean {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const priceId = process.env.STRIPE_PRICE_ID?.trim();

  if (!secretKey || !priceId) {
    return false;
  }

  if (secretKey.includes('your-key-here') || priceId.includes('your-monthly-price-id')) {
    return false;
  }

  try {
    validateStripeSecretKey(secretKey);
    return true;
  } catch {
    return false;
  }
}

export function assertStripeConfigured() {
  if (!isStripeConfigured()) {
    throw new Error(
      'Stripe is not configured on the server. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to .env, then run DEPLOY.cmd.'
    );
  }
}

export function getStripePriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID?.trim();
  if (!priceId) {
    throw new Error('STRIPE_PRICE_ID is not configured on the server.');
  }
  return priceId;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured on the server.');
  }
  return secret;
}

export function getPublicSiteUrl(request: Request): string {
  const configured =
    process.env.SITE_URL?.trim() ||
    process.env.EXPO_PUBLIC_API_ORIGIN?.trim() ||
    process.env.EXPO_PUBLIC_APP_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const origin = request.headers.get('origin');
  if (origin) {
    return origin.replace(/\/$/, '');
  }

  return 'https://soulmate-ai.expo.app';
}

export async function createCheckoutSession(params: {
  customerId?: string;
  customerEmail?: string;
  clientReferenceId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
}): Promise<StripeCheckoutSession> {
  return stripeRequest<StripeCheckoutSession>('POST', '/checkout/sessions', {
    mode: 'subscription',
    customer: params.customerId,
    customer_email: params.customerEmail,
    client_reference_id: params.clientReferenceId,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    line_items: [{ price: params.priceId, quantity: 1 }],
    metadata: { user_id: params.userId },
    subscription_data: {
      metadata: { user_id: params.userId },
    },
  });
}

export async function createBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  return stripeRequest<{ url: string }>('POST', '/billing_portal/sessions', {
    customer: params.customerId,
    return_url: params.returnUrl,
  });
}

function parseStripeSignatureHeader(header: string) {
  const timestamp = header
    .split(',')
    .map((part) => part.trim())
    .find((part) => part.startsWith('t='))
    ?.slice(2);

  const signatures = header
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) {
    throw new Error('Invalid Stripe signature header.');
  }

  return { timestamp, signatures };
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}

async function signStripePayload(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyStripeWebhook(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300
): Promise<StripeWebhookEvent> {
  const { timestamp, signatures } = parseStripeSignatureHeader(signatureHeader);
  const timestampSeconds = Number(timestamp);

  if (!Number.isFinite(timestampSeconds)) {
    throw new Error('Invalid Stripe signature timestamp.');
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - timestampSeconds;
  if (ageSeconds > toleranceSeconds) {
    throw new Error('Stripe webhook timestamp is outside the tolerance window.');
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = await signStripePayload(secret, signedPayload);
  const isValid = signatures.some((signature) => timingSafeEqualHex(signature, expectedSignature));

  if (!isValid) {
    throw new Error('Stripe webhook signature verification failed.');
  }

  return JSON.parse(rawBody) as StripeWebhookEvent;
}

export type { StripeCheckoutSession, StripeSubscription, StripeWebhookEvent };
