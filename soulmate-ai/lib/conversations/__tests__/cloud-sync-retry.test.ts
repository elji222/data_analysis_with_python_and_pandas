import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearCloudSyncRetry,
  scheduleCloudSyncRetry,
} from '@/lib/conversations/cloud-sync-retry';

describe('cloud-sync-retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearCloudSyncRetry('user-1');
    vi.useRealTimers();
  });

  it('retries after a failed cloud sync', async () => {
    const run = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(undefined);

    scheduleCloudSyncRetry('user-1', run);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(run).toHaveBeenCalledTimes(1);

    scheduleCloudSyncRetry('user-1', run);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('clears retry state after a successful sync', async () => {
    const run = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    scheduleCloudSyncRetry('user-1', run);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(run).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
