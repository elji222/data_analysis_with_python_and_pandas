import { MEMORY_CATEGORIES, type MemoryCategory, type MemoryExtractionItem } from '@/types/memory';

export const MEMORY_EXTRACTOR_PROMPT = `You extract durable long-term user memories for a personal AI companion.

Return strict JSON only: an array of objects.

Each object shape:
{
  "action": "add" | "update" | "delete" | "none",
  "memory_id": string | null,
  "category": one of ${MEMORY_CATEGORIES.map((c) => `"${c}"`).join(' | ')},
  "memory_text": "short atomic memory",
  "confidence": 0.0-1.0,
  "reason": "brief internal reason"
}

Rules:
- Only store durable facts about the user that help future conversations.
- Do NOT store random trivial facts, greetings, or one-off chit-chat.
- Do NOT store sensitive personal data unless the user clearly asks to remember it.
- Prefer short atomic memories.
- If nothing should be stored, return [{"action":"none","memory_id":null,"category":"other","memory_text":"","confidence":0,"reason":"nothing durable"}].
- Use update when new info supersedes an existing memory_id.
- Use delete only when the user clearly wants something forgotten.
- Never wrap JSON in markdown.`;

export function parseExtractionResponse(raw: string): MemoryExtractionItem[] {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith('[')
    ? trimmed
    : trimmed.match(/\[[\s\S]*\]/)?.[0] ?? '[]';

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => normalizeExtractionItem(item))
    .filter((item): item is MemoryExtractionItem => item !== null);
}

function normalizeExtractionItem(item: unknown): MemoryExtractionItem | null {
  if (!item || typeof item !== 'object') return null;
  const record = item as Record<string, unknown>;
  const action = record.action;
  const category = record.category;
  const memoryText = typeof record.memory_text === 'string' ? record.memory_text.trim() : '';
  const confidence = typeof record.confidence === 'number' ? record.confidence : 0;
  const reason = typeof record.reason === 'string' ? record.reason : '';
  const memoryId = typeof record.memory_id === 'string' ? record.memory_id : null;

  if (action !== 'add' && action !== 'update' && action !== 'delete' && action !== 'none') {
    return null;
  }

  if (!MEMORY_CATEGORIES.includes(category as MemoryCategory)) {
    return null;
  }

  if (action !== 'none' && action !== 'delete' && !memoryText) {
    return null;
  }

  return {
    action,
    memory_id: memoryId,
    category: category as MemoryCategory,
    memory_text: memoryText,
    confidence: Math.max(0, Math.min(1, confidence)),
    reason,
  };
}
