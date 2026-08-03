import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_CHAT_MODEL_ID, getChatModelById, type ChatModelId } from '@/constants/chat-models';

const CHAT_MODEL_KEY = '@soulmate-ai/chat-model';

export async function loadChatModelPreference(): Promise<ChatModelId> {
  try {
    const stored = await AsyncStorage.getItem(CHAT_MODEL_KEY);
    return getChatModelById(stored).id;
  } catch {
    return DEFAULT_CHAT_MODEL_ID;
  }
}

export async function saveChatModelPreference(modelId: ChatModelId) {
  try {
    await AsyncStorage.setItem(CHAT_MODEL_KEY, modelId);
  } catch {
    // The picker still works for this session; only persistence failed.
  }
}
