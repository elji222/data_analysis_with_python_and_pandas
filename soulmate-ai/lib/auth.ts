import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

export function getAuthRedirectUri() {
  // Expo Go must use exp://... deep links, not the standalone soulmateai:// scheme.
  if (isExpoGo()) {
    return Linking.createURL('/login');
  }

  return makeRedirectUri({
    scheme: 'soulmateai',
    path: 'login',
  });
}

function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your .env file.'
    );
  }
}

export async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  const { access_token, refresh_token, code } = params;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
    return;
  }

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) {
      throw error;
    }
    return;
  }

  throw new Error('Sign-in callback was missing auth credentials. Check your Supabase redirect URLs.');
}

export async function processAuthCallbackUrl(url: string) {
  if (!url.includes('code=') && !url.includes('access_token=')) {
    return false;
  }

  await createSessionFromUrl(url);
  return true;
}

async function waitForSession(timeoutMs = 1500) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      return data.session;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return null;
}

export async function signInWithGoogle() {
  assertSupabaseConfigured();

  const redirectTo = getAuthRedirectUri();

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) {
      throw error;
    }

    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error('Google sign-in could not be started.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    showInRecents: true,
  });

  if (result.type === 'success') {
    await createSessionFromUrl(result.url);
    return;
  }

  // On some phones the browser closes before Expo reports success, but the
  // deep link still completes sign-in in the background.
  const session = await waitForSession();
  if (session) {
    return;
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error(
      `Google sign-in was cancelled. In Supabase, add this Redirect URL: ${redirectTo}`
    );
  }

  throw new Error('Google sign-in did not complete. Please try again.');
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
