import { Platform } from 'react-native';

import { UI_VERSION } from '@/constants/chat-theme';
import { isMobileWebBrowser } from '@/lib/browser-capabilities';

const CONFIRMED_BUILD_KEY = '@soulmate/confirmed-build';
const RELOAD_ATTEMPTS_KEY = '@soulmate/reload-attempts';
const MAX_RELOAD_ATTEMPTS = 4;

function getRequestedBuildFromUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  return new URLSearchParams(window.location.search).get('v');
}

async function clearBrowserCaches() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
}

function buildFreshChatUrl(requestedBuild: string) {
  const url = new URL(window.location.href);
  url.pathname = '/chat';
  url.searchParams.set('v', requestedBuild);
  url.searchParams.set('fresh', String(Date.now()));
  return url.toString();
}

export type StaleBundleState = 'checking' | 'ready' | 'manual';

export async function recoverStaleWebBundle(): Promise<StaleBundleState> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return 'ready';
  }

  const requestedBuild = getRequestedBuildFromUrl();
  const confirmedBuild = window.localStorage.getItem(CONFIRMED_BUILD_KEY);
  const reloadAttempts = Number(window.sessionStorage.getItem(RELOAD_ATTEMPTS_KEY) ?? '0');

  if (!requestedBuild) {
    window.localStorage.setItem(CONFIRMED_BUILD_KEY, UI_VERSION);
    return 'ready';
  }

  if (requestedBuild === UI_VERSION) {
    window.localStorage.setItem(CONFIRMED_BUILD_KEY, UI_VERSION);
    window.sessionStorage.removeItem(RELOAD_ATTEMPTS_KEY);
    return 'ready';
  }

  if (reloadAttempts >= MAX_RELOAD_ATTEMPTS) {
    return 'manual';
  }

  window.sessionStorage.setItem(RELOAD_ATTEMPTS_KEY, String(reloadAttempts + 1));
  await clearBrowserCaches();
  window.localStorage.setItem(CONFIRMED_BUILD_KEY, requestedBuild);
  window.location.replace(buildFreshChatUrl(requestedBuild));
  return 'checking';
}

export function getStaleBundleHelpText() {
  const requestedBuild = getRequestedBuildFromUrl();
  const onPhone = isMobileWebBrowser();

  if (requestedBuild && requestedBuild !== UI_VERSION) {
    return `Your phone loaded build ${UI_VERSION}, but the link asks for ${requestedBuild}.`;
  }

  return onPhone
    ? 'Your phone browser is still showing an older copy of Soulmate AI.'
    : 'This browser tab is still showing an older copy of Soulmate AI.';
}

export async function hardRefreshWebBundle() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  const requestedBuild = getRequestedBuildFromUrl() ?? UI_VERSION;
  window.sessionStorage.removeItem(RELOAD_ATTEMPTS_KEY);
  await clearBrowserCaches();
  window.location.replace(buildFreshChatUrl(requestedBuild));
}
