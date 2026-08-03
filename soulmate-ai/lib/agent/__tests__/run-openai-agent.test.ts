import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  mergeToolCallDelta,
  runOpenAiAgent,
  toOpenAiMessages,
} from '@/lib/agent/run-openai-agent';
import type { ToolContext } from '@/lib/tools/types';

const TOOL_CONTEXT: ToolContext = {
  tavilyApiKey: null,
  openaiApiKey: null,
  openaiImageModel: null,
  imageServiceUrl: 'https://example.com/api/generate-image',
  authorizationHeader: null,
};

function sseBody(events: (object | string)[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        const data = typeof event === 'string' ? event : JSON.stringify(event);
        controller.enqueue(encoder.encode(`data: ${data}\n`));
      }
      controller.close();
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('toOpenAiMessages', () => {
  it('converts text and image blocks to OpenAI content parts', () => {
    const converted = toOpenAiMessages([
      { role: 'assistant', content: 'Hi there' },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is this?' },
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: 'abc123' },
          },
        ],
      },
    ]);

    expect(converted[0]).toEqual({ role: 'assistant', content: 'Hi there' });
    expect(converted[1]).toEqual({
      role: 'user',
      content: [
        { type: 'text', text: 'What is this?' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,abc123' } },
      ],
    });
  });
});

describe('mergeToolCallDelta', () => {
  it('merges OpenAI-style deltas by index', () => {
    const calls: { id: string; name: string; argumentsJson: string }[] = [];

    mergeToolCallDelta(calls, {
      index: 0,
      id: 'call_1',
      function: { name: 'web_search', arguments: '' },
    });
    mergeToolCallDelta(calls, { index: 0, function: { arguments: '{"query":' } });
    mergeToolCallDelta(calls, { index: 0, function: { arguments: '"news"}' } });

    expect(calls).toEqual([
      { id: 'call_1', name: 'web_search', argumentsJson: '{"query":"news"}' },
    ]);
  });

  it('handles Gemini deltas that omit the index field', () => {
    const calls: { id: string; name: string; argumentsJson: string }[] = [];

    mergeToolCallDelta(calls, {
      id: '',
      function: { name: 'web_search', arguments: '{"query":"news"}' },
    });

    expect(calls).toEqual([
      { id: '', name: 'web_search', argumentsJson: '{"query":"news"}' },
    ]);
  });
});

describe('runOpenAiAgent', () => {
  it('streams text deltas as they arrive', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: sseBody([
          { choices: [{ delta: { content: 'Hel' } }] },
          { choices: [{ delta: { content: 'lo!' } }] },
          { choices: [{ delta: {}, finish_reason: 'stop' }] },
          '[DONE]',
        ]),
      })
    );

    const events: { type: string; text?: string }[] = [];

    const result = await runOpenAiAgent({
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-test',
      systemPrompt: 'Be kind.',
      messages: [{ role: 'user', content: 'Hi' }],
      toolContext: TOOL_CONTEXT,
      onEvent: (event) => events.push(event as { type: string; text?: string }),
    });

    const textEvents = events.filter((event) => event.type === 'text');
    expect(textEvents.map((event) => event.text)).toEqual(['Hel', 'lo!']);
    expect(result.fullReply).toBe('Hello!');
    expect(result.usedTools).toBe(false);
  });

  it('runs a tool round and continues with the follow-up reply', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        body: sseBody([
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: 'call_dt',
                      function: {
                        name: 'get_current_datetime',
                        arguments: '{}',
                      },
                    },
                  ],
                },
              },
            ],
          },
          { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
          '[DONE]',
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        body: sseBody([
          { choices: [{ delta: { content: 'It is Monday.' } }] },
          { choices: [{ delta: {}, finish_reason: 'stop' }] },
          '[DONE]',
        ]),
      });

    vi.stubGlobal('fetch', fetchMock);

    const result = await runOpenAiAgent({
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-test',
      systemPrompt: 'Be kind.',
      messages: [{ role: 'user', content: 'What day is it?' }],
      toolContext: TOOL_CONTEXT,
      onEvent: () => {},
    });

    expect(result.fullReply).toBe('It is Monday.');
    expect(result.usedTools).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // The follow-up request must include the assistant tool call and its result.
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string) as {
      messages: Array<{ role: string; tool_call_id?: string }>;
    };
    const roles = secondBody.messages.map((message) => message.role);
    expect(roles).toContain('tool');
    expect(secondBody.messages.at(-1)?.role).toBe('tool');
    expect(secondBody.messages.at(-1)?.tool_call_id).toBe('call_dt');
  });
});
