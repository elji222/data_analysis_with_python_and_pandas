import { Platform } from 'react-native';

import { PRODUCTION_APP_URL } from '@/constants/app-urls';
import { isLocalHostname } from '@/lib/network-host';

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '');
}

export function getApiOrigin() {
  const configured = process.env.EXPO_PUBLIC_API_ORIGIN?.trim();

  if (configured) {
    return normalizeOrigin(configured);
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return normalizeOrigin(window.location.origin);
  }

  return PRODUCTION_APP_URL;
}

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const origin = getApiOrigin();

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (origin === normalizeOrigin(window.location.origin)) {
      return normalizedPath;
    }
  }

  return `${origin}${normalizedPath}`;
}

export function isLocalDevWebHost() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  return isLocalHostname(window.location.hostname);
}

export function isProductionWebHost() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  return window.location.hostname.includes('expo.app');
}
