import { getUserSubscription } from '@/lib/billing/repository';
import {
  assertStripeConfigured,
  createBillingPortalSession,
  getPublicSiteUrl,
} from '@/lib/billing/stripe';
import { requireUserAccess } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const auth = await requireUserAccess(request);
  if ('error' in auth) return auth.error;

  try {
    assertStripeConfigured();
    const subscription = await getUserSubscription(auth.serviceClient, auth.userId);
    if (!subscription?.stripe_customer_id) {
      return Response.json(
        { error: 'No Stripe customer found yet. Subscribe first.' },
        { status: 400 }
      );
    }

    const siteUrl = getPublicSiteUrl(request);
    const portalSession = await createBillingPortalSession({
      customerId: subscription.stripe_customer_id,
      returnUrl: `${siteUrl}/settings`,
    });

    return Response.json({ url: portalSession.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not open billing portal.';
    return Response.json({ error: message }, { status: 500 });
  }
}
