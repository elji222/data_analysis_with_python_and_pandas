import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';

import { isAdminEmail } from '@/lib/access/admin';
import { getDefaultPriceLabel, isActiveSubscriptionStatus } from '@/lib/billing/status';
import { getUserAccess } from '@/lib/access/repository';
import type { BillingStatus, SubscriptionStatus, UserSubscription } from '@/types/billing';

export async function getUserSubscription(
  client: SupabaseClient,
  userId: string
): Promise<UserSubscription | null> {
  const { data, error } = await client
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as UserSubscription | null;
}

export async function buildBillingStatus(
  client: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<BillingStatus> {
  const [subscription, access] = await Promise.all([
    getUserSubscription(client, userId),
    getUserAccess(client, userId),
  ]);

  const isComplimentary = Boolean(access?.is_admin) || isAdminEmail(email);
  const hasActiveSubscription =
    isComplimentary || isActiveSubscriptionStatus(subscription?.status ?? null);

  return {
    hasActiveSubscription,
    isComplimentary,
    subscription,
    priceLabel: getDefaultPriceLabel(),
  };
}

export async function upsertSubscriptionRecord(
  serviceClient: SupabaseClient,
  params: {
    userId: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    status: SubscriptionStatus;
    priceId?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
  }
): Promise<UserSubscription> {
  const { data, error } = await serviceClient
    .from('user_subscriptions')
    .upsert(
      {
        user_id: params.userId,
        stripe_customer_id: params.stripeCustomerId ?? null,
        stripe_subscription_id: params.stripeSubscriptionId ?? null,
        status: params.status,
        price_id: params.priceId ?? null,
        current_period_end: params.currentPeriodEnd ?? null,
        cancel_at_period_end: params.cancelAtPeriodEnd ?? false,
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data as UserSubscription;
}

export async function findUserIdByStripeCustomerId(
  serviceClient: SupabaseClient,
  stripeCustomerId: string
): Promise<string | null> {
  const { data, error } = await serviceClient
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  if (error) throw error;
  return data?.user_id ?? null;
}

export function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  return status as SubscriptionStatus;
}

export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  if (!subscription.current_period_end) return null;
  return new Date(subscription.current_period_end * 1000).toISOString();
}
