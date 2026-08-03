import {
  CHAT_TOOLS,
  executeToolCall,
  isGenerateImageTool,
  isWebSearchTool,
  TOOL_USE_SYSTEM_NOTE,
} from '@/lib/tools/registry';
import {
  parseGenerateImageToolResult,
  formatGenerateImageToolResultForAnthropic,
} from '@/lib/tools/generate-image';
import type { ToolContext } from '@/lib/tools/types';
import type { ApiContentBlock, ChatApiMessage } from '@/types/chat';

import type { AgentStreamEvent } from './types';

const MAX_TOOL_ROUNDS = 3;

type OpenAiContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type OpenAiToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

type OpenAiMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | OpenAiContentPart[] }
  | { role: 'assistant'; content: string | null; tool_calls?: OpenAiToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

/**
 * Converts the app's Anthropic-shaped chat messages into OpenAI chat format.
 * Both OpenAI and Gemini (via its OpenAI-compatible endpoint) consume this.
 */
export function toOpenAiMessages(messages: ChatApiMessage[]): OpenAiMessage[] {
  return messages.map((message) => {
    if (message.role === 'assistant') {
      return {
        role: 'assistant' as const,
        content: typeof message.content === 'string' ? message.content : '',
      };
    }

    if (typeof message.content === 'string') {
      return { role: 'user' as const, content: message.content };
    }

    const parts: OpenAiContentPart[] = message.content.map((block: ApiContentBlock) => {
      if (block.type === 'image') {
        return {
          type: 'image_url' as const,
          image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` },
        };
      }

      return { type: 'text' as const, text: block.text };
    });

    return { role: 'user' as const, content: parts };
  });
}

export function buildOpenAiTools() {
  return CHAT_TOOLS.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

type StreamedToolCall = {
  id: string;
  name: string;
  argumentsJson: string;
};

type OpenAiStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string | null;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  error?: { message?: string };
};

/**
 * Merges a streamed tool-call delta into the accumulated list. Gemini's
 * OpenAI-compatible endpoint omits `index` on tool-call deltas, so a missing
 * index falls back to the last started call (or a new slot when the delta
 * carries an id or name).
 */
export function mergeToolCallDelta(
  calls: StreamedToolCall[],
  delta: { index?: number; id?: string; function?: { name?: string; arguments?: string } }
): void {
  let slot: number;

  if (typeof delta.index === 'number') {
    slot = delta.index;
  } else if (delta.function?.name) {
    // Without an index, a delta that carries a name starts a new call.
    slot = calls.length;
  } else {
    // Argument fragments without an index continue the latest call.
    slot = Math.max(calls.length - 1, 0);
  }

  while (calls.length <= slot) {
    calls.push({ id: '', name: '', argumentsJson: '' });
  }

  const call = calls[slot];
  if (delta.id) call.id = delta.id;
  if (delta.function?.name) call.name += delta.function.name;
  if (delta.function?.arguments) call.argumentsJson += delta.function.arguments;
}

function parseToolArguments(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export type RunOpenAiAgentOptions = {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  messages: ChatApiMessage[];
  toolContext: ToolContext;
  onEvent: (event: AgentStreamEvent) => void;
};

export type RunOpenAiAgentResult = {
  fullReply: string;
  usedTools: boolean;
};

const IMAGE_ONLY_REPLY = "Here's your generated image.";

export async function runOpenAiAgent(
  options: RunOpenAiAgentOptions
): Promise<RunOpenAiAgentResult> {
  let conversation: OpenAiMessage[] = [
    { role: 'system', content: `${options.systemPrompt}\n\n${TOOL_USE_SYSTEM_NOTE}` },
    ...toOpenAiMessages(options.messages),
  ];
  let fullReply = '';
  let usedTools = false;
  let generatedImageCount = 0;
  let imageGenerationAttempted = false;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const isFinalAllowedRound = round === MAX_TOOL_ROUNDS;

    const response = await fetch(`${options.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
      },
      // No token cap: GPT-5-era models reject `max_tokens` on chat completions
      // and Gemini's compatibility layer has its own default.
      body: JSON.stringify({
        model: options.model,
        messages: conversation,
        tools: isFinalAllowedRound ? undefined : buildOpenAiTools(),
        stream: true,
      }),
    });

    if (!response.ok) {
      const json = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      const message =
        json.error?.message ?? 'Unable to reach Soulmate AI right now. Please try again.';
      options.onEvent({ type: 'error', error: message });
      throw new Error(message);
    }

    if (!response.body) {
      const message = 'No response stream received.';
      options.onEvent({ type: 'error', error: message });
      throw new Error(message);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const toolCalls: StreamedToolCall[] = [];
    let emittedRoundText = false;

    const handleChunk = (chunk: OpenAiStreamChunk) => {
      if (chunk.error?.message) {
        throw new Error(chunk.error.message);
      }

      const choice = chunk.choices?.[0];
      if (!choice) return;

      for (const toolDelta of choice.delta?.tool_calls ?? []) {
        mergeToolCallDelta(toolCalls, toolDelta);
      }

      const text = choice.delta?.content;
      if (typeof text === 'string' && text) {
        let delta = text;

        // Text following a tool round continues an already-visible reply.
        if (!emittedRoundText && fullReply.trim() && !fullReply.endsWith('\n')) {
          delta = `\n\n${delta}`;
        }

        emittedRoundText = true;
        fullReply += delta;
        options.onEvent({ type: 'text', text: delta });
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;

        let parsed: OpenAiStreamChunk;
        try {
          parsed = JSON.parse(data) as OpenAiStreamChunk;
        } catch {
          continue;
        }

        handleChunk(parsed);
      }
    }

    const completedToolCalls = toolCalls.filter((call) => call.name);
    const shouldRunTools = completedToolCalls.length > 0 && !isFinalAllowedRound;

    if (!shouldRunTools) {
      if (!fullReply.trim()) {
        if (generatedImageCount > 0) {
          fullReply = IMAGE_ONLY_REPLY;
          options.onEvent({ type: 'text', text: fullReply });
        } else {
          const message = 'Soulmate AI sent an empty reply.';
          options.onEvent({ type: 'error', error: message });
          throw new Error(message);
        }
      }

      options.onEvent({ type: 'done', fullReply });
      return { fullReply, usedTools };
    }

    usedTools = true;

    // Gemini can send empty tool-call ids; results must reference the same id.
    const normalizedCalls = completedToolCalls.map((call, index) => ({
      ...call,
      id: call.id || `call_${round}_${index}`,
    }));

    conversation = [
      ...conversation,
      {
        role: 'assistant',
        content: null,
        tool_calls: normalizedCalls.map((call) => ({
          id: call.id,
          type: 'function' as const,
          function: { name: call.name, arguments: call.argumentsJson || '{}' },
        })),
      },
    ];

    for (const call of normalizedCalls) {
      if (isWebSearchTool(call.name)) {
        options.onEvent({ type: 'status', status: 'searching' });
      }

      let result: string;

      if (isGenerateImageTool(call.name)) {
        if (imageGenerationAttempted) {
          conversation = [
            ...conversation,
            {
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify({
                error: 'Image generation was already attempted for this message.',
              }),
            },
          ];
          continue;
        }

        imageGenerationAttempted = true;
        options.onEvent({ type: 'status', status: 'generating_image' });

        result = await executeToolCall(
          { id: call.id, name: call.name, input: parseToolArguments(call.argumentsJson) },
          options.toolContext
        );

        const parsed = parseGenerateImageToolResult(result);
        if (parsed && 'imageUrl' in parsed && parsed.imageUrl) {
          generatedImageCount += 1;
          options.onEvent({
            type: 'generated_image',
            image: {
              id: call.id,
              url: parsed.imageUrl,
              prompt: parsed.prompt ?? 'Generated image',
            },
          });
        } else if (parsed && 'error' in parsed && parsed.error) {
          options.onEvent({ type: 'image_error', error: parsed.error });
        }

        conversation = [
          ...conversation,
          {
            role: 'tool',
            tool_call_id: call.id,
            content: formatGenerateImageToolResultForAnthropic(result),
          },
        ];
        continue;
      }

      result = await executeToolCall(
        { id: call.id, name: call.name, input: parseToolArguments(call.argumentsJson) },
        options.toolContext
      );

      conversation = [
        ...conversation,
        { role: 'tool', tool_call_id: call.id, content: result },
      ];
    }
  }

  const message = 'Soulmate AI could not finish the reply.';
  options.onEvent({ type: 'error', error: message });
  throw new Error(message);
}
