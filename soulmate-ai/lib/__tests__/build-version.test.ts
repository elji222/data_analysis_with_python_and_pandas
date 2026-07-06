import { describe, expect, it } from 'vitest';

import { compareBuildVersions } from '@/lib/build-version';

describe('compareBuildVersions', () => {
  it('orders dated build ids chronologically', () => {
    expect(compareBuildVersions('2026-07-27', '2026-07-28')).toBeLessThan(0);
    expect(compareBuildVersions('2026-07-28', '2026-07-27')).toBeGreaterThan(0);
    expect(compareBuildVersions('2026-07-28', '2026-07-28')).toBe(0);
  });

  it('ignores suffixes after the date', () => {
    expect(compareBuildVersions('2026-07-27a', '2026-07-28')).toBeLessThan(0);
    expect(compareBuildVersions('2026-07-28', '2026-07-28a')).toBe(0);
  });
});
