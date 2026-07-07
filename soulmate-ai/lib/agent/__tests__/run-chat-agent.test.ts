import { describe, expect, it } from 'vitest';

import { applyAnthropicStreamEvent } from '@/lib/agent/run-chat-agent';

function createState() {
  return {
    text: '',
    toolUses: [] as Array<{ type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }>,
    currentToolUseId: null as string | null,
    currentToolName: null as string | null,
    currentToolInputJson: '',
    stopReason: null as string | null,
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
