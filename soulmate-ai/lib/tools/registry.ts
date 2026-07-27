import { datetimeTool } from './datetime';
import { generateImageTool } from './generate-image';
import { webSearchTool } from './web-search';
import type { ToolCall, ToolContext, ToolHandler } from './types';

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  [datetimeTool.definition.name]: datetimeTool,
  [generateImageTool.definition.name]: generateImageTool,
  [webSearchTool.definition.name]: webSearchTool,
};

export const CHAT_TOOLS = Object.values(TOOL_HANDLERS).map((tool) => tool.definition);

export const TOOL_USE_SYSTEM_NOTE = `You can use tools when needed:
- web_search for latest news, current events, sports, weather, and other live facts.
- get_current_datetime for today's date or current time.
- generate_image when the user asks you to create, draw, generate, or make a picture or image.
When you use web search, summarize clearly, mention that results are from the web, and avoid inventing headlines.
When you generate an image, briefly describe what you created after the image is ready.`;

export async function executeToolCall(call: ToolCall, context: ToolContext): Promise<string> {
  const handler = TOOL_HANDLERS[call.name];

  if (!handler) {
    return `Unknown tool: ${call.name}`;
  }

  try {
    return await handler.execute(call.input, context);
  } catch {
    return `Tool ${call.name} failed. Tell the user you could not complete that lookup right now.`;
  }
}

export function isWebSearchTool(name: string) {
  return name === webSearchTool.definition.name;
}

export function isGenerateImageTool(name: string) {
  return name === generateImageTool.definition.name;
}
