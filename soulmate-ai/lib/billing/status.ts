import { isAdminEmail } from '@/lib/access/admin';
import type { SubscriptionStatus, UserSubscription } from '@/types/billing';

const ACTIVE_STATUSES = new Set<SubscriptionStatus>(['active', 'trialing']);

export function isActiveSubscriptionStatus(status: string | null | undefined): boolean {
  return ACTIVE_STATUSES.has(status as SubscriptionStatus);
}

export function hasPaidAccess(params: {
  email?: string | null;
  isAdmin?: boolean;
  subscription?: UserSubscription | null;
}): boolean {
  if (params.isAdmin || isAdminEmail(params.email)) {
    return true;
  }

  return isActiveSubscriptionStatus(params.subscription?.status);
}

export function getDefaultPriceLabel(): string {
  return process.env.EXPO_PUBLIC_STRIPE_PRICE_LABEL?.trim() || '$9.99/month';
}
