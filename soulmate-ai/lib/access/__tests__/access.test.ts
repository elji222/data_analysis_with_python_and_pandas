import { describe, expect, it } from 'vitest';

import { getAdminEmails, isAdminEmail } from '@/lib/access/admin';
import { formatInviteCode, generateInviteCode, normalizeInviteCode } from '@/lib/access/invite-code';

describe('invite codes', () => {
  it('normalizes codes to uppercase alphanumeric', () => {
    expect(normalizeInviteCode(' ab12-cd34 ')).toBe('AB12CD34');
  });

  it('formats codes for display', () => {
    expect(formatInviteCode('AB12CD34')).toBe('AB12-CD34');
  });

  it('generates 8-character codes', () => {
    expect(generateInviteCode()).toHaveLength(8);
  });
});

describe('admin emails', () => {
  it('reads admin emails from env', () => {
    const original = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = 'Admin@Example.com, friend@test.com';
    expect(getAdminEmails()).toEqual(['admin@example.com', 'friend@test.com']);
    expect(isAdminEmail('Admin@Example.com')).toBe(true);
    process.env.ADMIN_EMAILS = original;
  });
});
