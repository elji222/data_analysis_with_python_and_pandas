export type ChatModelId = 'claude' | 'gpt' | 'gemini';

export type ChatModelOption = {
  id: ChatModelId;
  label: string;
  maker: string;
  tagline: string;
  provider: 'anthropic' | 'openai-compatible';
  apiModel: string;
  /** Base URL for OpenAI-compatible providers. */
  baseUrl?: string;
  /** Server env var holding the API key for this model. */
  apiKeyEnvVar: 'ANTHROPIC_API_KEY' | 'OPENAI_API_KEY' | 'GEMINI_API_KEY';
};

export const CHAT_MODELS: ChatModelOption[] = [
  {
    id: 'claude',
    label: 'Claude',
    maker: 'Anthropic',
    tagline: 'Warm, thoughtful conversation',
    provider: 'anthropic',
    apiModel: 'claude-sonnet-4-5',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'gpt',
    label: 'ChatGPT',
    maker: 'OpenAI',
    tagline: 'Fast, versatile answers',
    provider: 'openai-compatible',
    apiModel: 'gpt-5.6-terra',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnvVar: 'OPENAI_API_KEY',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    maker: 'Google',
    tagline: 'Quick, up-to-date helper',
    provider: 'openai-compatible',
    apiModel: 'gemini-3.6-flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKeyEnvVar: 'GEMINI_API_KEY',
  },
];

export const DEFAULT_CHAT_MODEL_ID: ChatModelId = 'claude';

export function getChatModelById(id: string | null | undefined): ChatModelOption {
  const found = CHAT_MODELS.find((model) => model.id === id);
  return found ?? CHAT_MODELS.find((model) => model.id === DEFAULT_CHAT_MODEL_ID)!;
}
