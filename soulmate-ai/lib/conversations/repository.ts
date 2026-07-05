import type { SupabaseClient } from '@supabase/supabase-js';

import {
  mapConversationToRows,
  mapRowsToConversations,
  type ConversationRow,
  type MessageRow,
} from '@/lib/conversations/sync';
import type { Conversation } from '@/types/conversation';

export async function listCloudConversations(
  client: SupabaseClient,
  userId: string
): Promise<Conversation[]> {
  const { data: conversationRows, error: conversationError } = await client
    .from('user_conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false });

  if (conversationError) throw conversationError;

  const rows = (conversationRows ?? []) as ConversationRow[];
  if (rows.length === 0) return [];

  const conversationIds = rows.map((row) => row.id);
  const { data: messageRows, error: messageError } = await client
    .from('user_conversation_messages')
    .select('*')
    .eq('user_id', userId)
    .in('conversation_id', conversationIds)
    .order('sort_order', { ascending: true });

  if (messageError) throw messageError;

  return mapRowsToConversations(rows, (messageRows ?? []) as MessageRow[]);
}

export async function upsertCloudConversation(
  client: SupabaseClient,
  userId: string,
  conversation: Conversation
): Promise<void> {
  const { conversation: conversationRow, messages } = mapConversationToRows(userId, conversation);

  const { error: conversationError } = await client
    .from('user_conversations')
    .upsert(conversationRow, { onConflict: 'id' });

  if (conversationError) throw conversationError;

  const { error: deleteError } = await client
    .from('user_conversation_messages')
    .delete()
    .eq('conversation_id', conversation.id)
    .eq('user_id', userId);

  if (deleteError) throw deleteError;

  if (messages.length === 0) return;

  const { error: insertError } = await client.from('user_conversation_messages').insert(messages);
  if (insertError) throw insertError;
}

export async function upsertCloudConversations(
  client: SupabaseClient,
  userId: string,
  conversations: Conversation[]
): Promise<void> {
  for (const conversation of conversations) {
    await upsertCloudConversation(client, userId, conversation);
  }
}

export async function deleteCloudConversation(
  client: SupabaseClient,
  userId: string,
  conversationId: string
): Promise<void> {
  const { error } = await client
    .from('user_conversations')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function getCloudActiveConversationId(
  client: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await client
    .from('user_chat_preferences')
    .select('active_conversation_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.active_conversation_id ?? null;
}

export async function setCloudActiveConversationId(
  client: SupabaseClient,
  userId: string,
  conversationId: string
): Promise<void> {
  const { error } = await client.from('user_chat_preferences').upsert(
    {
      user_id: userId,
      active_conversation_id: conversationId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) throw error;
}
