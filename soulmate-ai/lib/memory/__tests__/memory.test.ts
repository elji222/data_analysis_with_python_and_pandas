import { describe, expect, it } from 'vitest';

import { parseExtractionResponse } from '@/lib/memory/extract';
import { detectMemoryIntent } from '@/lib/memory/intent';
import { buildChatSystemPrompt } from '@/lib/memory/prompt';
import {
  buildMemoryPromptSection,
  findBestForgetMatch,
  findDuplicateMemory,
  rankMemoriesForQuery,
} from '@/lib/memory/search';
import { isTrivialMemory } from '@/lib/memory/trivial';
import type { UserMemory, UserMemorySettings } from '@/types/memory';

function makeMemory(overrides: Partial<UserMemory> = {}): UserMemory {
  return {
    id: overrides.id ?? 'memory-1',
    user_id: 'user-1',
    category: overrides.category ?? 'preferences',
    memory_text: overrides.memory_text ?? 'User prefers concise answers.',
    confidence: overrides.confidence ?? 0.9,
    source_conversation_id: null,
    source_message_id: null,
    importance: overrides.importance ?? 0,
    is_pinned: overrides.is_pinned ?? false,
    is_deleted: false,
    created_at: '2026-07-05T00:00:00.000Z',
    updated_at: '2026-07-05T00:00:00.000Z',
  };
}

describe('memory intent detection', () => {
  it('detects explicit remember requests', () => {
    const intent = detectMemoryIntent('Remember that I prefer concise answers.');
    expect(intent).toEqual({
      type: 'remember',
      text: 'I prefer concise answers.',
    });
  });

  it('detects explicit forget requests', () => {
    const intent = detectMemoryIntent('Forget that I work at Acme.');
    expect(intent.type).toBe('forget');
    if (intent.type === 'forget') {
      expect(intent.text).toContain('Acme');
    }
  });

  it('finds the best memory to forget', () => {
    const memories = [
      makeMemory({ id: 'work', memory_text: 'User works at Acme Corp.', category: 'work' }),
      makeMemory({ id: 'food', memory_text: 'User likes sushi.', category: 'preferences' }),
    ];

    const match = findBestForgetMatch(memories, 'work at Acme');
    expect(match?.id).toBe('work');
  });

  it('detects do-not-remember requests', () => {
    const intent = detectMemoryIntent("Don't remember this");
    expect(intent).toEqual({ type: 'skip' });
  });
});

describe('trivial memory filtering', () => {
  it('blocks trivial memories', () => {
    expect(isTrivialMemory('hi')).toBe(true);
    expect(isTrivialMemory('thanks')).toBe(true);
    expect(isTrivialMemory('User prefers concise answers.')).toBe(false);
  });
});

describe('duplicate prevention', () => {
  it('finds duplicate memories by normalized text', () => {
    const memories = [makeMemory({ memory_text: 'User prefers concise answers.' })];
    const duplicate = findDuplicateMemory(memories, 'user prefers concise answers.');
    expect(duplicate?.id).toBe('memory-1');
  });
});

describe('memory retrieval', () => {
  it('ranks relevant memories for a query', () => {
    const memories = [
      makeMemory({ id: 'a', memory_text: 'User works in healthcare.', category: 'work' }),
      makeMemory({
        id: 'b',
        memory_text: 'User prefers concise answers.',
        category: 'communication_style',
      }),
    ];

    const ranked = rankMemoriesForQuery(memories, 'Please keep your answers concise', 5);
    expect(ranked[0]?.id).toBe('b');
  });

  it('injects relevant memories into the system prompt', () => {
    const settings: UserMemorySettings = {
      user_id: 'user-1',
      enabled: true,
      preferred_language: 'English',
      answer_style: 'concise',
      created_at: '2026-07-05T00:00:00.000Z',
      updated_at: '2026-07-05T00:00:00.000Z',
    };

    const prompt = buildChatSystemPrompt(settings, [
      makeMemory({ memory_text: 'User is building Soulmate AI.' }),
    ]);

    expect(prompt).toContain('Preferred language: English');
    expect(prompt).toContain('Relevant user memories:');
    expect(prompt).toContain('User is building Soulmate AI.');
  });
});

describe('memory extraction parsing', () => {
  it('parses strict JSON extraction output', () => {
    const items = parseExtractionResponse(
      JSON.stringify([
        {
          action: 'add',
          memory_id: null,
          category: 'preferences',
          memory_text: 'User prefers concise answers.',
          confidence: 0.9,
          reason: 'stable preference',
        },
      ])
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.action).toBe('add');
  });

  it('returns none actions without crashing', () => {
    const items = parseExtractionResponse(
      '[{"action":"none","memory_id":null,"category":"other","memory_text":"","confidence":0,"reason":"nothing durable"}]'
    );
    expect(items[0]?.action).toBe('none');
  });
});

describe('prompt sections', () => {
  it('builds memory section only when memories exist', () => {
    expect(buildMemoryPromptSection([])).toBe('');
    expect(buildMemoryPromptSection([makeMemory()])).toContain('- User prefers concise answers.');
  });
});

describe('memory disabled behavior', () => {
  it('does not include memories when settings are empty and memory list is empty', () => {
    const prompt = buildChatSystemPrompt(null, []);
    expect(prompt).not.toContain('Relevant user memories:');
  });
});
