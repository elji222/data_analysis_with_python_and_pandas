import AsyncStorage from '@react-native-async-storage/async-storage';

import { UI_VERSION } from '@/constants/chat-theme';
import { supabase } from '@/lib/supabase';

const BUILD_STORAGE_KEY = '@soulmate/installed-build';

export async function enforceCurrentBuild(): Promise<void> {
  const previousBuild = await AsyncStorage.getItem(BUILD_STORAGE_KEY);

  if (previousBuild && previousBuild !== UI_VERSION) {
    await supabase.auth.signOut();
  }

  await AsyncStorage.setItem(BUILD_STORAGE_KEY, UI_VERSION);
}
