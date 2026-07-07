export type AgentStreamEvent =
  | { type: 'status'; status: 'searching' }
  | { type: 'text'; text: string }
  | { type: 'error'; error: string }
  | { type: 'done'; fullReply: string };

export type AnthropicTextBlock = {
  type: 'text';
  text: string;
};

export type AnthropicToolUseBlock = {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type AnthropicToolResultBlock = {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
};

export type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock;

export type AnthropicAgentMessage = {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
};
