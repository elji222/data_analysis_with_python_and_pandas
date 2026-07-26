import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured on the server.');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
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
