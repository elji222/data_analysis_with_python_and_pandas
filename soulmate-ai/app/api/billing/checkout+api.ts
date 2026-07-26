import { getUserSubscription } from '@/lib/billing/repository';
import {
  assertStripeConfigured,
  getPublicSiteUrl,
  getStripeClient,
  getStripePriceId,
} from '@/lib/billing/stripe';
import { requireUserAccess } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const auth = await requireUserAccess(request);
  if ('error' in auth) return auth.error;

  try {
    assertStripeConfigured();
    const stripe = getStripeClient();
    const priceId = getStripePriceId();
    const siteUrl = getPublicSiteUrl(request);
    const existing = await getUserSubscription(auth.serviceClient, auth.userId);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: existing?.stripe_customer_id ?? undefined,
      customer_email: existing?.stripe_customer_id ? undefined : auth.user.email ?? undefined,
      client_reference_id: auth.userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/settings?checkout=success`,
      cancel_url: `${siteUrl}/settings?checkout=canceled`,
      metadata: {
        user_id: auth.userId,
      },
      subscription_data: {
        metadata: {
          user_id: auth.userId,
        },
      },
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
