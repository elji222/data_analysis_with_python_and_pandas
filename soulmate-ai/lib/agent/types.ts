export type GeneratedImage = {
  id: string;
  url: string;
  prompt: string;
};

export type AgentStreamEvent =
  | {
      type: 'status';
      status: 'searching' | 'generating_image' | 'council_answers' | 'council_ranking';
    }
  | { type: 'generated_image'; image: GeneratedImage }
  | { type: 'image_error'; error: string }
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
