import Constants from 'expo-constants';
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
  if (isExpoGo()) {
    return makeRedirectUri({
      path: 'login',
    });
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

  if (Platform.OS !== 'web') {
    await WebBrowser.dismissBrowser();
  }

  return true;
}

async function waitForSession(timeoutMs: number) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      return data.session;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
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

  // openAuthSessionAsync often reports "cancelled" in Expo Go even when sign-in works.
  // Open the system browser and wait for the exp:// deep link to return to the app.
  await WebBrowser.openBrowserAsync(data.url, {
    showInRecents: true,
  });

  const session = await waitForSession(120000);
  if (session) {
    return;
  }

  throw new Error(
    `Sign-in did not finish. In Supabase Redirect URLs, add:\nexp://**\n${redirectTo}`
  );
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
