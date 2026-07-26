import type Stripe from 'stripe';

import {
  findUserIdByStripeCustomerId,
  mapStripeSubscriptionStatus,
  getSubscriptionPeriodEnd,
  upsertSubscriptionRecord,
} from '@/lib/billing/repository';
import type { SupabaseClient } from '@supabase/supabase-js';

async function resolveUserId(
  serviceClient: SupabaseClient,
  params: {
    userId?: string | null;
    customerId?: string | null;
  }
): Promise<string | null> {
  if (params.userId) return params.userId;
  if (!params.customerId) return null;
  return findUserIdByStripeCustomerId(serviceClient, params.customerId);
}

export async function syncSubscriptionFromStripe(
  serviceClient: SupabaseClient,
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null
) {
  const userId = await resolveUserId(serviceClient, {
    userId: subscription.metadata.user_id ?? fallbackUserId,
    customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
  });

  if (!userId) return;

  await upsertSubscriptionRecord(serviceClient, {
    userId,
    stripeCustomerId:
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null,
    stripeSubscriptionId: subscription.id,
    status: mapStripeSubscriptionStatus(subscription.status),
    priceId: subscription.items.data[0]?.price.id ?? null,
    currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

export async function handleStripeWebhookEvent(
  serviceClient: SupabaseClient,
  event: Stripe.Event
) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') return;

      const userId = session.client_reference_id ?? session.metadata?.user_id ?? null;
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

      if (!userId) return;

      await upsertSubscriptionRecord(serviceClient, {
        userId,
        stripeCustomerId: customerId ?? null,
        stripeSubscriptionId: subscriptionId ?? null,
        status: 'active',
      });
      return;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscriptionFromStripe(
        serviceClient,
        subscription,
        subscription.metadata.user_id ?? null
      );
      return;
    }

    default:
      return;
  }
}
