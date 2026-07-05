import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  MemoryCategory,
  MemoryExtractionItem,
  MemoryVisibility,
  UserMemory,
  UserMemorySettings,
} from '@/types/memory';

import { normalizeMemoryCategory, normalizeMemoryVisibility } from '@/lib/memory/categories';

import { findDuplicateMemory } from './search';
import { isTrivialMemory } from './trivial';

type MemoryRow = UserMemory;

export async function getMemorySettings(
  client: SupabaseClient,
  userId: string
): Promise<UserMemorySettings | null> {
  const { data, error } = await client
    .from('user_memory_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as UserMemorySettings | null;
}

export async function ensureMemorySettings(
  client: SupabaseClient,
  userId: string
): Promise<UserMemorySettings> {
  const existing = await getMemorySettings(client, userId);
  if (existing) return existing;

  const { data, error } = await client
    .from('user_memory_settings')
    .insert({ user_id: userId })
    .select('*')
    .single();

  if (error) throw error;
  return data as UserMemorySettings;
}

export async function updateMemorySettings(
  client: SupabaseClient,
  userId: string,
  patch: Partial<Pick<UserMemorySettings, 'enabled' | 'preferred_language' | 'answer_style'>>
): Promise<UserMemorySettings> {
  await ensureMemorySettings(client, userId);

  const { data, error } = await client
    .from('user_memory_settings')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data as UserMemorySettings;
}

export async function listActiveMemories(
  client: SupabaseClient,
  userId: string
): Promise<UserMemory[]> {
  const { data, error } = await client
    .from('user_memories')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('is_pinned', { ascending: false })
    .order('importance', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => normalizeMemoryRow(row as UserMemory));
}

function normalizeMemoryRow(memory: UserMemory): UserMemory {
  return {
    ...memory,
    category: normalizeMemoryCategory(memory.category),
    visibility: normalizeMemoryVisibility(memory.visibility),
  };
}

export async function createMemory(
  client: SupabaseClient,
  input: {
    user_id: string;
    category: MemoryCategory;
    memory_text: string;
    visibility?: MemoryVisibility;
    confidence?: number;
    source_conversation_id?: string | null;
    source_message_id?: string | null;
    importance?: number;
    is_pinned?: boolean;
  }
): Promise<UserMemory> {
  const { data, error } = await client
    .from('user_memories')
    .insert({
      user_id: input.user_id,
      category: input.category,
      visibility: input.visibility ?? 'personal',
      memory_text: input.memory_text,
      confidence: input.confidence ?? 0.85,
      source_conversation_id: input.source_conversation_id ?? null,
      source_message_id: input.source_message_id ?? null,
      importance: input.importance ?? 0,
      is_pinned: input.is_pinned ?? false,
      is_deleted: false,
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeMemoryRow(data as UserMemory);
}

export async function updateMemory(
  client: SupabaseClient,
  userId: string,
  memoryId: string,
  patch: Partial<
    Pick<
      UserMemory,
      'category' | 'visibility' | 'memory_text' | 'confidence' | 'importance' | 'is_pinned'
    >
  >
): Promise<UserMemory> {
  const { data, error } = await client
    .from('user_memories')
    .update(patch)
    .eq('id', memoryId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeMemoryRow(data as UserMemory);
}

export async function softDeleteMemory(
  client: SupabaseClient,
  userId: string,
  memoryId: string
): Promise<void> {
  const { error } = await client
    .from('user_memories')
    .update({ is_deleted: true })
    .eq('id', memoryId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function clearAllMemories(client: SupabaseClient, userId: string): Promise<void> {
  const { error } = await client
    .from('user_memories')
    .update({ is_deleted: true })
    .eq('user_id', userId)
    .eq('is_deleted', false);

  if (error) throw error;
}

export async function applyExtractionItems(
  client: SupabaseClient,
  userId: string,
  items: MemoryExtractionItem[],
  existingMemories: UserMemory[],
  context: {
    source_conversation_id?: string | null;
    source_message_id?: string | null;
  }
): Promise<{ saved: UserMemory[]; deletedIds: string[] }> {
  const saved: UserMemory[] = [];
  const deletedIds: string[] = [];

  for (const item of items) {
    if (item.action === 'none') continue;

    if (item.action === 'delete') {
      const targetId =
        item.memory_id ??
        existingMemories.find(
          (memory) =>
            memory.memory_text.trim().toLowerCase() === item.memory_text.trim().toLowerCase()
        )?.id;

      if (targetId) {
        await softDeleteMemory(client, userId, targetId);
        deletedIds.push(targetId);
      }
      continue;
    }

    if (!item.memory_text || isTrivialMemory(item.memory_text)) continue;
    if (item.confidence < 0.55) continue;

    if (item.action === 'update' && item.memory_id) {
      const updated = await updateMemory(client, userId, item.memory_id, {
        category: item.category,
        memory_text: item.memory_text,
        confidence: item.confidence,
      });
      saved.push(updated);
      continue;
    }

    const duplicate = findDuplicateMemory(existingMemories, item.memory_text);
    if (duplicate) {
      const updated = await updateMemory(client, userId, duplicate.id, {
        category: item.category,
        memory_text: item.memory_text,
        confidence: Math.max(duplicate.confidence, item.confidence),
      });
      saved.push(updated);
      continue;
    }

    const created = await createMemory(client, {
      user_id: userId,
      category: item.category,
      memory_text: item.memory_text,
      confidence: item.confidence,
      source_conversation_id: context.source_conversation_id,
      source_message_id: context.source_message_id,
    });
    saved.push(created);
    existingMemories.push(created);
  }

  return { saved, deletedIds };
}

export type { MemoryRow };
