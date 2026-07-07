export type ToolInputSchema = {
  type: 'object';
  properties: Record<string, { type: string; description?: string }>;
  required?: string[];
};

export type AnthropicToolDefinition = {
  name: string;
  description: string;
  input_schema: ToolInputSchema;
};

export type ToolContext = {
  tavilyApiKey?: string | null;
};

export type ToolCall = {
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type ToolHandler = {
  definition: AnthropicToolDefinition;
  execute: (input: Record<string, unknown>, context: ToolContext) => Promise<string>;
};
