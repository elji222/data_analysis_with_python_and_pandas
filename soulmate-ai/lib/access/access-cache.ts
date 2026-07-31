import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AccessStatus } from '@/types/access';

const GRANTED_ACCESS_KEY = '@soulmate-ai/granted-access';

type CachedAccess = {
  userId: string;
  status: AccessStatus;
};

/**
 * Verifying an invite is a network round-trip, so a previously granted result is
 * reused to open the app immediately while the real check runs in the background.
 */
export async function readCachedAccess(userId: string): Promise<AccessStatus | null> {
  try {
    const raw = await AsyncStorage.getItem(GRANTED_ACCESS_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedAccess;
    if (cached.userId !== userId || !cached.status?.hasAccess) {
      return null;
    }

    return cached.status;
  } catch {
    return null;
  }
}

export async function writeCachedAccess(userId: string, status: AccessStatus) {
  if (!status.hasAccess) {
    await clearCachedAccess();
    return;
  }

  try {
    await AsyncStorage.setItem(
      GRANTED_ACCESS_KEY,
      JSON.stringify({ userId, status } satisfies CachedAccess)
    );
  } catch {
    // A cache miss only costs a slower start.
  }
}

export async function clearCachedAccess() {
  try {
    await AsyncStorage.removeItem(GRANTED_ACCESS_KEY);
  } catch {
    // Ignore: the cache is advisory.
  }
}
