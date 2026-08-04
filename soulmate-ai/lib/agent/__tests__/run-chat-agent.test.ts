import { afterEach, describe, expect, it, vi } from 'vitest';

import { applyAnthropicStreamEvent, runChatAgent } from '@/lib/agent/run-chat-agent';

function createState() {
  return {
    text: '',
    toolUses: [] as Array<{ type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }>,
    currentToolUseId: null as string | null,
    currentToolName: null as string | null,
    currentToolInputJson: '',
    stopReason: null as string | null,
    inputTokens: 0,
    outputTokens: 0,
  };
}

describe('applyAnthropicStreamEvent', () => {
  it('captures tool_use blocks and stop_reason from message_delta', () => {
    const state = createState();

    applyAnthropicStreamEvent(state, {
      type: 'content_block_start',
      content_block: { type: 'tool_use', id: 'toolu_123', name: 'web_search' },
    });
    applyAnthropicStreamEvent(state, {
      type: 'content_block_delta',
      delta: { type: 'input_json_delta', partial_json: '{"query":"Israel news"}' },
    });
    applyAnthropicStreamEvent(state, { type: 'content_block_stop' });
    applyAnthropicStreamEvent(state, {
      type: 'message_delta',
      delta: { stop_reason: 'tool_use' },
    });

    expect(state.toolUses).toHaveLength(1);
    expect(state.toolUses[0]?.name).toBe('web_search');
    expect(state.toolUses[0]?.input).toEqual({ query: 'Israel news' });
    expect(state.stopReason).toBe('tool_use');
  });
});

function sseBody(events: object[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n`));
      }
      controller.close();
    },
  });
}

describe('runChatAgent streaming', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('emits each text delta as it arrives instead of buffering the round', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: sseBody([
          { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hel' } },
          { type: 'content_block_delta', delta: { type: 'text_delta', text: 'lo!' } },
          { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
        ]),
      })
    );

    const events: Array<{ type: string; text?: string }> = [];

    const result = await runChatAgent({
      apiKey: 'test-key',
      systemPrompt: 'Be kind.',
      messages: [{ role: 'user', content: 'Hi' }],
      toolContext: {
        tavilyApiKey: null,
        openaiApiKey: null,
        openaiImageModel: null,
        imageServiceUrl: 'https://example.com/api/generate-image',
        authorizationHeader: null,
      },
      onEvent: (event) => events.push(event as { type: string; text?: string }),
    });

    const textEvents = events.filter((event) => event.type === 'text');
    expect(textEvents.map((event) => event.text)).toEqual(['Hel', 'lo!']);
    expect(result.fullReply).toBe('Hello!');
    expect(result.usedTools).toBe(false);
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
  });
});
