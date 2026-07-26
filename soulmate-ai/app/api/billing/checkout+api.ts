import { getUserSubscription } from '@/lib/billing/repository';
import {
  assertStripeConfigured,
  createCheckoutSession,
  getPublicSiteUrl,
  getStripePriceId,
} from '@/lib/billing/stripe';
import { requireUserAccess } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const auth = await requireUserAccess(request);
  if ('error' in auth) return auth.error;

  try {
    assertStripeConfigured();
    const priceId = getStripePriceId();
    const siteUrl = getPublicSiteUrl(request);
    const existing = await getUserSubscription(auth.serviceClient, auth.userId);

    const session = await createCheckoutSession({
      customerId: existing?.stripe_customer_id ?? undefined,
      customerEmail: existing?.stripe_customer_id ? undefined : auth.user.email ?? undefined,
      clientReferenceId: auth.userId,
      priceId,
      successUrl: `${siteUrl}/settings?checkout=success`,
      cancelUrl: `${siteUrl}/settings?checkout=canceled`,
      userId: auth.userId,
    });

    if (!session.url) {
      return Response.json({ error: 'Could not start Stripe Checkout.' }, { status: 500 });
    }

    return Response.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start checkout.';
    return Response.json({ error: message }, { status: 500 });
  }
}
