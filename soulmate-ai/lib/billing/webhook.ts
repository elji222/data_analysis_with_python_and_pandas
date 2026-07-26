import {
  findUserIdByStripeCustomerId,
  mapStripeSubscriptionStatus,
  getSubscriptionPeriodEnd,
  upsertSubscriptionRecord,
} from '@/lib/billing/repository';
import type { StripeCheckoutSession, StripeSubscription, StripeWebhookEvent } from '@/lib/billing/stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

function getStripeId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

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
  subscription: StripeSubscription,
  fallbackUserId?: string | null
) {
  const userId = await resolveUserId(serviceClient, {
    userId: subscription.metadata.user_id ?? fallbackUserId,
    customerId: getStripeId(subscription.customer),
  });

  if (!userId) return;

  await upsertSubscriptionRecord(serviceClient, {
    userId,
    stripeCustomerId: getStripeId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    status: mapStripeSubscriptionStatus(subscription.status),
    priceId: subscription.items.data[0]?.price.id ?? null,
    currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

export async function handleStripeWebhookEvent(
  serviceClient: SupabaseClient,
  event: StripeWebhookEvent
) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as StripeCheckoutSession;
      if (session.mode !== 'subscription') return;

      const userId = session.client_reference_id ?? session.metadata?.user_id ?? null;
      const customerId = getStripeId(session.customer);
      const subscriptionId = getStripeId(session.subscription);

      if (!userId) return;

      await upsertSubscriptionRecord(serviceClient, {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status: 'active',
      });
      return;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as StripeSubscription;
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
