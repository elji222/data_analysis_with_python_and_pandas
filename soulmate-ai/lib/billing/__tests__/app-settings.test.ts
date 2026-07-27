import { afterEach, describe, expect, it } from 'vitest';

import {
  clearBillingAppSettingsCache,
  getFreeAccessForAll,
} from '@/lib/billing/app-settings';

describe('billing app settings', () => {
  afterEach(() => {
    clearBillingAppSettingsCache();
    delete process.env.FREE_ACCESS_FOR_ALL;
  });

  it('returns true when FREE_ACCESS_FOR_ALL env is enabled', async () => {
    process.env.FREE_ACCESS_FOR_ALL = 'true';
    await expect(getFreeAccessForAll(null)).resolves.toBe(true);
  });

  it('returns false when no service client is available', async () => {
    await expect(getFreeAccessForAll(null)).resolves.toBe(false);
  });
});
