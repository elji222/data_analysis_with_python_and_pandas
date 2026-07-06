import AsyncStorage from '@react-native-async-storage/async-storage';

import { UI_VERSION } from '@/constants/chat-theme';

const BUILD_STORAGE_KEY = '@soulmate/installed-build';

export async function enforceCurrentBuild(): Promise<void> {
  await AsyncStorage.setItem(BUILD_STORAGE_KEY, UI_VERSION);
}
