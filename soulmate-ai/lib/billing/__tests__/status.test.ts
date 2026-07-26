import { describe, expect, it } from 'vitest';

import { hasPaidAccess, isActiveSubscriptionStatus } from '@/lib/billing/status';

describe('billing status', () => {
  it('treats active and trialing as paid', () => {
    expect(isActiveSubscriptionStatus('active')).toBe(true);
    expect(isActiveSubscriptionStatus('trialing')).toBe(true);
    expect(isActiveSubscriptionStatus('canceled')).toBe(false);
  });

  it('lets admins through without a subscription row', () => {
    expect(
      hasPaidAccess({
        email: 'admin@example.com',
        isAdmin: true,
        subscription: null,
      })
    ).toBe(true);
  });

  it('requires an active subscription for regular users', () => {
    expect(
      hasPaidAccess({
        email: 'member@example.com',
        subscription: { status: 'active' } as never,
      })
    ).toBe(true);

    expect(
      hasPaidAccess({
        email: 'member@example.com',
        subscription: { status: 'canceled' } as never,
      })
    ).toBe(false);
  });
});
