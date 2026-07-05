import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  deleteCloudConversation,
  getCloudActiveConversationId,
  listCloudConversations,
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

export class ConversationCloudError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'ConversationCloudError';
  }
}

export async function loadSyncedConversations(userId: string): Promise<{
  conversations: Conversation[];
  activeConversationId: string | null;
  source: 'cloud' | 'local' | 'merged';
}> {
  const [localConversations, localActiveId] = await Promise.all([
    loadConversations(userId),
    loadActiveConversationId(userId),
  ]);

  if (!isSupabaseConfigured()) {
    return {
      conversations: localConversations,
      activeConversationId: localActiveId,
      source: 'local',
    };
  }

  try {
    const cloudConversations = await listCloudConversations(supabase, userId);
    const cloudActiveId = await getCloudActiveConversationId(supabase, userId);

    if (cloudConversations.length === 0 && localConversations.length > 0) {
      const migrated = stripConversationsForStorage(localConversations);
      await upsertCloudConversations(supabase, userId, migrated);
      if (localActiveId) {
        await setCloudActiveConversationId(supabase, userId, localActiveId);
      }
      await saveConversations(userId, migrated);
      return {
        conversations: migrated,
        activeConversationId: localActiveId,
        source: 'merged',
      };
    }

    if (cloudConversations.length === 0) {
      return {
        conversations: [],
        activeConversationId: cloudActiveId,
        source: 'cloud',
      };
    }

    const merged = mergeConversations(cloudConversations, localConversations);
    const stripped = stripConversationsForStorage(merged);
    const activeConversationId = cloudActiveId ?? localActiveId;

    if (conversationsNeedCloudUpload(cloudConversations, stripped)) {
      await upsertCloudConversations(supabase, userId, stripped);
    }

    await saveConversations(userId, stripped);
    if (activeConversationId) {
      await saveActiveConversationId(userId, activeConversationId);
    }

    return {
      conversations: stripped,
      activeConversationId,
      source: merged.length !== cloudConversations.length ? 'merged' : 'cloud',
    };
  } catch (error) {
    if (localConversations.length > 0) {
      return {
        conversations: localConversations,
        activeConversationId: localActiveId,
        source: 'local',
      };
    }

    throw new ConversationCloudError('Could not load your cloud chat history.', error);
  }
}

export async function persistSyncedConversations(
  userId: string,
  conversations: Conversation[]
): Promise<void> {
  const stripped = stripConversationsForStorage(conversations);
  await saveConversations(userId, stripped);

  if (!isSupabaseConfigured()) return;

  await upsertCloudConversations(supabase, userId, stripped);
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

  await setCloudActiveConversationId(supabase, userId, conversationId);
}

export async function refreshCloudConversations(userId: string): Promise<Conversation[]> {
  if (!isSupabaseConfigured()) {
    return loadConversations(userId);
  }

  const cloudConversations = await listCloudConversations(supabase, userId);
  const localConversations = await loadConversations(userId);
  const merged = stripConversationsForStorage(mergeConversations(cloudConversations, localConversations));

  if (conversationsNeedCloudUpload(cloudConversations, merged)) {
    await upsertCloudConversations(supabase, userId, merged);
  }

  await saveConversations(userId, merged);
  return merged;
}
