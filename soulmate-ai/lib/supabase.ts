import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-anon-key';

function getAuthStorage() {
  if (isServer) return undefined;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage;
  }
  return AsyncStorage;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      supabaseKey &&
      supabaseUrl !== PLACEHOLDER_URL &&
      !supabaseUrl.includes('your-project-id') &&
      supabaseKey !== PLACEHOLDER_KEY &&
      !supabaseKey.includes('your-supabase-anon-key') &&
      !supabaseKey.includes('your-supabase-publishable-key')
  );
}

export const supabase = createClient(
  supabaseUrl ?? PLACEHOLDER_URL,
  supabaseKey ?? PLACEHOLDER_KEY,
  {
    auth: {
      storage: getAuthStorage(),
      autoRefreshToken: !isServer,
      persistSession: !isServer,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  }
);
