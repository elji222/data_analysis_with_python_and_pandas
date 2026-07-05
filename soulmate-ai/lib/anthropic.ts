import { CLAUDE_MODEL } from '@/constants/ai';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';

type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function callAnthropicText(options: {
  apiKey: string;
  system: string;
  messages: AnthropicMessage[];
  maxTokens?: number;
}): Promise<string> {
  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': options.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: options.maxTokens ?? 500,
      system: options.system,
      messages: options.messages,
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    const message = json.error?.message ?? 'Anthropic request failed';
    throw new Error(message);
  }

  const text = json.content
    ?.find((block: { type: string }) => block.type === 'text')
    ?.text?.trim();

  if (!text) {
    throw new Error('Anthropic returned an empty response.');
  }

  return text;
}
