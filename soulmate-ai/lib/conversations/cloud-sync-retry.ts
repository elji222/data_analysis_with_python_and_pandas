const RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 30_000, 60_000];

type RetryState = {
  timer: ReturnType<typeof setTimeout> | null;
  attempt: number;
  running: boolean;
};

const retryStates = new Map<string, RetryState>();

function getRetryState(userId: string): RetryState {
  const existing = retryStates.get(userId);
  if (existing) return existing;

  const created: RetryState = { timer: null, attempt: 0, running: false };
  retryStates.set(userId, created);
  return created;
}

export function clearCloudSyncRetry(userId: string) {
  const state = retryStates.get(userId);
  if (!state) return;

  if (state.timer) {
    clearTimeout(state.timer);
  }

  retryStates.delete(userId);
}

export function scheduleCloudSyncRetry(userId: string, run: () => Promise<void>) {
  const state = getRetryState(userId);
  if (state.timer || state.running) return;

  const delay = RETRY_DELAYS_MS[Math.min(state.attempt, RETRY_DELAYS_MS.length - 1)];

  state.timer = setTimeout(() => {
    state.timer = null;
    state.running = true;

    void run()
      .then(() => {
        state.attempt = 0;
        retryStates.delete(userId);
      })
      .catch(() => {
        state.attempt += 1;
        state.running = false;
        scheduleCloudSyncRetry(userId, run);
      })
      .finally(() => {
        state.running = false;
      });
  }, delay);
}
