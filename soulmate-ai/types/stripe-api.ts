export type StripeSubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'unpaid';

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  mode: string;
  customer: string | { id: string } | null;
  subscription: string | { id: string } | null;
  client_reference_id: string | null;
  metadata?: Record<string, string>;
};

export type StripeSubscription = {
  id: string;
  status: StripeSubscriptionStatus;
  customer: string | { id: string };
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  metadata: Record<string, string>;
  items: {
    data: Array<{
      price: {
        id: string;
      };
    }>;
  };
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: StripeCheckoutSession | StripeSubscription | Record<string, unknown>;
  };
};
