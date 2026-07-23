import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PENDING_INVITE_CODE_KEY = '@soulmate-ai/pending-invite-code';

export async function savePendingInviteCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    await clearPendingInviteCode();
    return;
  }

  await AsyncStorage.setItem(PENDING_INVITE_CODE_KEY, normalized);
}

export async function getPendingInviteCode(): Promise<string | null> {
  const stored = await AsyncStorage.getItem(PENDING_INVITE_CODE_KEY);
  return stored?.trim() || null;
}

export async function clearPendingInviteCode() {
  await AsyncStorage.removeItem(PENDING_INVITE_CODE_KEY);
}

export function readInviteCodeFromUrl(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const invite = params.get('invite') ?? params.get('code');
  return invite?.trim() || null;
}
