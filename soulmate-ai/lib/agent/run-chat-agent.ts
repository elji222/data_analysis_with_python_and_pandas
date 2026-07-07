import { CLAUDE_MODEL, MAX_OUTPUT_TOKENS } from '@/constants/ai';
import {
  CHAT_TOOLS,
  executeToolCall,
  isWebSearchTool,
  TOOL_USE_SYSTEM_NOTE,
} from '@/lib/tools/registry';
import type { ToolContext } from '@/lib/tools/types';

import type {
  AgentStreamEvent,
  AnthropicAgentMessage,
  AnthropicContentBlock,
  AnthropicToolUseBlock,
} from './types';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MAX_TOOL_ROUNDS = 3;

type StreamState = {
  text: string;
  toolUses: AnthropicToolUseBlock[];
  currentToolUseId: string | null;
  currentToolName: string | null;
  currentToolInputJson: string;
  stopReason: string | null;
};

function createStreamState(): StreamState {
  return {
    text: '',
    toolUses: [],
    currentToolUseId: null,
    currentToolName: null,
    currentToolInputJson: '',
    stopReason: null,
  };
}

function parseToolInput(raw: string): Record<string, unknown> {
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

function finalizeCurrentToolUse(state: StreamState) {
  if (!state.currentToolUseId || !state.currentToolName) return;

  state.toolUses.push({
    type: 'tool_use',
    id: state.currentToolUseId,
    name: state.currentToolName,
    input: parseToolInput(state.currentToolInputJson),
  });

  state.currentToolUseId = null;
  state.currentToolName = null;
  state.currentToolInputJson = '';
}

function buildAssistantContent(state: StreamState): AnthropicContentBlock[] {
  const blocks: AnthropicContentBlock[] = [];

  if (state.text.trim()) {
    blocks.push({ type: 'text', text: state.text });
  }

  blocks.push(...state.toolUses);
  return blocks;
}

async function* parseAnthropicStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<{
  state: StreamState;
  textDelta?: string;
}> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const state = createStreamState();

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

      let event: {
        type?: string;
        index?: number;
        content_block?: { type?: string; id?: string; name?: string };
        delta?: { type?: string; text?: string; partial_json?: string };
        message?: { stop_reason?: string };
      };

      try {
        event = JSON.parse(data);
      } catch {
        continue;
      }

      if (event.type === 'content_block_start') {
        if (event.content_block?.type === 'tool_use') {
          finalizeCurrentToolUse(state);
          state.currentToolUseId = event.content_block.id ?? null;
          state.currentToolName = event.content_block.name ?? null;
          state.currentToolInputJson = '';
        }
        continue;
      }

      if (event.type === 'content_block_delta') {
        if (event.delta?.type === 'text_delta' && event.delta.text) {
          state.text += event.delta.text;
          yield { state, textDelta: event.delta.text };
        }

        if (event.delta?.type === 'input_json_delta' && event.delta.partial_json) {
          state.currentToolInputJson += event.delta.partial_json;
        }
        continue;
      }

      if (event.type === 'content_block_stop') {
        finalizeCurrentToolUse(state);
        continue;
      }

      if (event.type === 'message_delta' && event.message?.stop_reason) {
        state.stopReason = event.message.stop_reason;
      }
    }
  }

  finalizeCurrentToolUse(state);
  yield { state };
}

export type RunChatAgentOptions = {
  apiKey: string;
  systemPrompt: string;
  messages: AnthropicAgentMessage[];
  toolContext: ToolContext;
  onEvent: (event: AgentStreamEvent) => void;
};

export async function runChatAgent(options: RunChatAgentOptions): Promise<string> {
  const system = `${options.systemPrompt}\n\n${TOOL_USE_SYSTEM_NOTE}`;
  let conversation = [...options.messages];
  let fullReply = '';

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const isFinalAllowedRound = round === MAX_TOOL_ROUNDS;
    const response = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': options.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system,
        messages: conversation,
        tools: isFinalAllowedRound ? undefined : CHAT_TOOLS,
        stream: true,
      }),
    });

    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
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

    let roundText = '';
    let roundState = createStreamState();
    const streamLive = round > 0;

    for await (const chunk of parseAnthropicStream(response.body)) {
      roundState = chunk.state;

      if (chunk.textDelta) {
        roundText += chunk.textDelta;

        if (streamLive) {
          fullReply += chunk.textDelta;
          options.onEvent({ type: 'text', text: chunk.textDelta });
        }
      }
    }

    const stopReason = roundState.stopReason ?? 'end_turn';
    const toolUses = roundState.toolUses;

    if (stopReason !== 'tool_use' || toolUses.length === 0 || isFinalAllowedRound) {
      if (!streamLive && roundText.trim()) {
        fullReply = roundText;
        options.onEvent({ type: 'text', text: roundText });
      }

      if (!fullReply.trim() && roundText.trim()) {
        fullReply = roundText;
      }

      options.onEvent({ type: 'done', fullReply });
      return fullReply;
    }

    const assistantContent = buildAssistantContent(roundState);
    conversation = [
      ...conversation,
      { role: 'assistant', content: assistantContent },
    ];

    const toolResults: AnthropicContentBlock[] = [];

    for (const toolUse of toolUses) {
      if (isWebSearchTool(toolUse.name)) {
        options.onEvent({ type: 'status', status: 'searching' });
      }

      const result = await executeToolCall(
        { id: toolUse.id, name: toolUse.name, input: toolUse.input },
        options.toolContext
      );

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    conversation = [...conversation, { role: 'user', content: toolResults }];
  }

  options.onEvent({ type: 'done', fullReply });
  return fullReply;
}
