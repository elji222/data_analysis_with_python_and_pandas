import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  deleteCloudConversation,
  fetchCloudConversationBundle,
  setCloudActiveConversationId,
  upsertCloudConversation,
  upsertCloudConversations,
} from '@/lib/conversations/repository';
import { mergeConversations, conversationsNeedCloudUpload } from '@/lib/conversations/sync';
import { stripConversationsForStorage } from '@/lib/strip-attachments-for-storage';
import {
  loadActiveConversationId,
  loadConversations,
  saveActiveConversationId,
  saveConversations,
} from '@/services/conversation-storage';
import type { Conversation } from '@/types/conversation';

const CLOUD_REQUEST_TIMEOUT_MS = 4000;

export class ConversationCloudError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'ConversationCloudError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ConversationCloudError(message));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function fetchCloudState(userId: string): Promise<{
  conversations: Conversation[];
  activeConversationId: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { conversations: [], activeConversationId: null };
  }

  return withTimeout(
    fetchCloudConversationBundle(supabase, userId),
    CLOUD_REQUEST_TIMEOUT_MS,
    'Cloud chat sync timed out.'
  );
}

function scheduleCloudUpload(userId: string, conversations: Conversation[]) {
  if (!isSupabaseConfigured() || conversations.length === 0) return;

  void upsertCloudConversations(supabase, userId, conversations).catch(() => {
    // Background upload failures are handled on the next explicit save.
  });
}

export async function syncConversationsFromCloud(userId: string): Promise<{
  conversations: Conversation[];
  activeConversationId: string | null;
  warning?: string | null;
}> {
  const [localConversations, localActiveId] = await Promise.all([
    loadConversations(userId),
    loadActiveConversationId(userId),
  ]);

  if (!isSupabaseConfigured()) {
    return {
      conversations: localConversations,
      activeConversationId: localActiveId,
      warning:
        localConversations.length > 0
          ? 'Cloud sync is unavailable right now. Showing chats saved on this device.'
          : null,
    };
  }

  try {
    const { conversations: cloudConversations, activeConversationId: cloudActiveId } =
      await fetchCloudState(userId);

    if (cloudConversations.length === 0 && localConversations.length > 0) {
      const migrated = stripConversationsForStorage(localConversations);
      await saveConversations(userId, migrated);
      scheduleCloudUpload(userId, migrated);

      if (localActiveId) {
        void setCloudActiveConversationId(supabase, userId, localActiveId).catch(() => {});
      }

      return {
        conversations: migrated,
        activeConversationId: localActiveId,
      };
    }

    if (cloudConversations.length === 0) {
      return {
        conversations: [],
        activeConversationId: cloudActiveId,
      };
    }

    const merged = stripConversationsForStorage(mergeConversations(cloudConversations, localConversations));
    const activeConversationId = cloudActiveId ?? localActiveId;

    await saveConversations(userId, merged);
    if (activeConversationId) {
      await saveActiveConversationId(userId, activeConversationId);
    }

    if (conversationsNeedCloudUpload(cloudConversations, merged)) {
      scheduleCloudUpload(userId, merged);
    }

    return {
      conversations: merged,
      activeConversationId,
    };
  } catch (error) {
    if (localConversations.length > 0) {
      return {
        conversations: localConversations,
        activeConversationId: localActiveId,
        warning: 'Cloud sync is unavailable right now. Showing chats saved on this device.',
      };
    }

    throw new ConversationCloudError('Could not load your cloud chat history.', error);
  }
}

export async function loadSyncedConversations(userId: string): Promise<{
  conversations: Conversation[];
  activeConversationId: string | null;
  source: 'cloud' | 'local' | 'merged';
}> {
  const result = await syncConversationsFromCloud(userId);

  return {
    conversations: result.conversations,
    activeConversationId: result.activeConversationId,
    source: result.warning ? 'local' : 'cloud',
  };
}

export async function persistSyncedConversations(
  userId: string,
  conversations: Conversation[]
): Promise<void> {
  const stripped = stripConversationsForStorage(conversations);
  await saveConversations(userId, stripped);

  if (!isSupabaseConfigured()) return;

  await withTimeout(
    upsertCloudConversations(supabase, userId, stripped),
    CLOUD_REQUEST_TIMEOUT_MS,
    'Cloud chat sync timed out.'
  );
}

export async function persistSyncedConversation(
  userId: string,
  conversation: Conversation,
  allConversations: Conversation[]
): Promise<void> {
  const strippedConversation = stripConversationsForStorage([conversation])[0];
  const strippedAll = stripConversationsForStorage(allConversations);
  await saveConversations(userId, strippedAll);

  if (!isSupabaseConfigured()) return;

  await upsertCloudConversation(supabase, userId, strippedConversation);
}

export async function removeSyncedConversation(
  userId: string,
  conversationId: string,
  remainingConversations: Conversation[]
): Promise<void> {
  const stripped = stripConversationsForStorage(remainingConversations);
  await saveConversations(userId, stripped);

  if (!isSupabaseConfigured()) return;

  await deleteCloudConversation(supabase, userId, conversationId);
}

export async function persistSyncedActiveConversationId(
  userId: string,
  conversationId: string
): Promise<void> {
  await saveActiveConversationId(userId, conversationId);

  if (!isSupabaseConfigured()) return;

  await withTimeout(
    setCloudActiveConversationId(supabase, userId, conversationId),
    CLOUD_REQUEST_TIMEOUT_MS,
    'Cloud chat sync timed out.'
  );
}

export async function refreshCloudConversations(userId: string): Promise<Conversation[]> {
  const result = await syncConversationsFromCloud(userId);
  return result.conversations;
}
