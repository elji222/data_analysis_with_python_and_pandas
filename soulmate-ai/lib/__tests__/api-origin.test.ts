import { describe, expect, it } from 'vitest';

import { isLocalHostname } from '@/lib/network-host';

describe('isLocalHostname', () => {
  it('detects local network dev hosts', () => {
    expect(isLocalHostname('192.168.1.20')).toBe(true);
    expect(isLocalHostname('localhost')).toBe(true);
  });

  it('detects production hosts', () => {
    expect(isLocalHostname('soulmate-ai.expo.app')).toBe(false);
  });
});
