import { addManualMemory } from '@/lib/memory/process';
import {
  clearAllMemories,
  ensureMemorySettings,
  listActiveMemories,
  softDeleteMemory,
  updateMemory,
  updateMemorySettings,
} from '@/lib/memory/repository';
import { MEMORY_CATEGORIES, type MemoryCategory } from '@/types/memory';
import {
  createSupabaseServerClient,
  getAuthenticatedUserId,
  getBearerToken,
} from '@/lib/supabase-server';

function isMemoryCategory(value: unknown): value is MemoryCategory {
  return typeof value === 'string' && MEMORY_CATEGORIES.includes(value as MemoryCategory);
}

async function getClient(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  const token = getBearerToken(request);
  if (!userId || !token) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return {
    userId,
    client: createSupabaseServerClient(token),
  };
}

export async function GET(request: Request) {
  const auth = await getClient(request);
  if ('error' in auth) return auth.error;

  const settings = await ensureMemorySettings(auth.client, auth.userId);
  const memories = await listActiveMemories(auth.client, auth.userId);

  return Response.json({ settings, memories });
}

export async function POST(request: Request) {
  const auth = await getClient(request);
  if ('error' in auth) return auth.error;

  const body = await request.json();
  const action = body.action as string | undefined;

  if (action === 'clear') {
    await clearAllMemories(auth.client, auth.userId);
    return Response.json({ ok: true });
  }

  if (action === 'settings') {
    const settings = await updateMemorySettings(auth.client, auth.userId, {
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      preferred_language:
        typeof body.preferred_language === 'string' ? body.preferred_language : undefined,
      answer_style: typeof body.answer_style === 'string' ? body.answer_style : undefined,
    });
    return Response.json({ settings });
  }

  const memoryText = typeof body.memory_text === 'string' ? body.memory_text.trim() : '';
  if (!memoryText) {
    return Response.json({ error: 'memory_text is required' }, { status: 400 });
  }

  if (!isMemoryCategory(body.category)) {
    return Response.json({ error: 'Invalid memory category' }, { status: 400 });
  }

  const memory = await addManualMemory(auth.client, auth.userId, {
    category: body.category,
    memory_text: memoryText,
    is_pinned: body.is_pinned === true,
    importance: typeof body.importance === 'number' ? body.importance : 1,
  });

  return Response.json({ memory });
}

export async function PATCH(request: Request) {
  const auth = await getClient(request);
  if ('error' in auth) return auth.error;

  const body = await request.json();
  const memoryId = typeof body.id === 'string' ? body.id : null;
  if (!memoryId) {
    return Response.json({ error: 'id is required' }, { status: 400 });
  }

  const patch: Parameters<typeof updateMemory>[3] = {};
  if (typeof body.memory_text === 'string') patch.memory_text = body.memory_text.trim();
  if (isMemoryCategory(body.category)) patch.category = body.category;
  if (typeof body.confidence === 'number') patch.confidence = body.confidence;
  if (typeof body.importance === 'number') patch.importance = body.importance;
  if (typeof body.is_pinned === 'boolean') patch.is_pinned = body.is_pinned;

  const memory = await updateMemory(auth.client, auth.userId, memoryId, patch);
  return Response.json({ memory });
}

export async function DELETE(request: Request) {
  const auth = await getClient(request);
  if ('error' in auth) return auth.error;

  const url = new URL(request.url);
  const memoryId = url.searchParams.get('id');

  if (!memoryId) {
    return Response.json({ error: 'id is required' }, { status: 400 });
  }

  await softDeleteMemory(auth.client, auth.userId, memoryId);
  return Response.json({ ok: true });
}
