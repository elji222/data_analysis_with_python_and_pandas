import type { ToolHandler } from './types';

const OPENAI_IMAGES_ENDPOINT = 'https://api.openai.com/v1/images/generations';
const REQUEST_TIMEOUT_MS = 60_000;

type ImageSize = '1024x1024' | '1792x1024' | '1024x1792';

function resolveImageSize(aspectRatio: unknown): ImageSize {
  const value = typeof aspectRatio === 'string' ? aspectRatio.trim().toLowerCase() : '';

  if (value === 'landscape' || value === 'wide' || value === '16:9') {
    return '1792x1024';
  }

  if (value === 'portrait' || value === 'tall' || value === '9:16') {
    return '1024x1792';
  }

  return '1024x1024';
}

export const generateImageTool: ToolHandler = {
  definition: {
    name: 'generate_image',
    description:
      'Generate an original image from a text description. Use when the user asks to create, draw, generate, make, or show a picture or image.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed description of the image to generate.',
        },
        aspect_ratio: {
          type: 'string',
          description: 'Optional aspect ratio: square, landscape, or portrait.',
        },
      },
      required: ['prompt'],
    },
  },
  async execute(input, context) {
    const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';

    if (!prompt) {
      return JSON.stringify({ error: 'Image generation failed: prompt is required.' });
    }

    const apiKey = context.openaiApiKey?.trim();
    if (!apiKey) {
      return JSON.stringify({
        error:
          'Image generation is not configured on the server. Add OPENAI_API_KEY to .env and redeploy.',
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(OPENAI_IMAGES_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: resolveImageSize(input.aspect_ratio),
          response_format: 'url',
        }),
      });

      const json = (await response.json()) as {
        data?: Array<{ url?: string }>;
        error?: { message?: string };
      };

      if (!response.ok) {
        const message = json.error?.message ?? `Image generation failed (${response.status}).`;
        return JSON.stringify({ error: message });
      }

      const imageUrl = json.data?.[0]?.url?.trim();
      if (!imageUrl) {
        return JSON.stringify({ error: 'Image generation did not return a URL.' });
      }

      return JSON.stringify({
        imageUrl,
        prompt,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'Image generation timed out. Please try again.'
          : error instanceof Error
            ? error.message
            : 'Image generation failed.';
      return JSON.stringify({ error: message });
    } finally {
      clearTimeout(timeoutId);
    }
  },
};

export function parseGenerateImageToolResult(result: string) {
  try {
    const parsed = JSON.parse(result) as {
      imageUrl?: string;
      prompt?: string;
      error?: string;
    };

    if (parsed.error) {
      return { error: parsed.error } as const;
    }

    if (parsed.imageUrl) {
      return {
        imageUrl: parsed.imageUrl,
        prompt: parsed.prompt ?? 'Generated image',
      } as const;
    }
  } catch {
    return null;
  }

  return null;
}
