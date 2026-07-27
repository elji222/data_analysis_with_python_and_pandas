import {
  generateImageFromPrompt,
  getOpenAiImageModel,
  IMAGE_GENERATION_TIMEOUT_MS,
} from '@/lib/image-generation/service';
import type { ToolHandler } from './types';

const IMAGE_SERVICE_TIMEOUT_MS = IMAGE_GENERATION_TIMEOUT_MS + 5_000;

async function requestImageViaService(params: {
  imageServiceUrl: string;
  authorizationHeader: string;
  prompt: string;
  aspectRatio: unknown;
  signal: AbortSignal;
}) {
  const response = await fetch(params.imageServiceUrl, {
    method: 'POST',
    signal: params.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: params.authorizationHeader,
    },
    body: JSON.stringify({
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio,
    }),
  });

  const json = (await response.json().catch(() => ({}))) as {
    imageUrl?: string;
    prompt?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(json.error ?? `Image generation failed (${response.status}).`);
  }

  if (!json.imageUrl) {
    throw new Error('Image generation did not return image data.');
  }

  return {
    imageUrl: json.imageUrl,
    prompt: json.prompt ?? params.prompt,
  };
}

export { getOpenAiImageModel };

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_SERVICE_TIMEOUT_MS);

    try {
      const imageServiceUrl = context.imageServiceUrl?.trim();
      const authorizationHeader = context.authorizationHeader?.trim();

      if (imageServiceUrl && authorizationHeader) {
        const result = await requestImageViaService({
          imageServiceUrl,
          authorizationHeader,
          prompt,
          aspectRatio: input.aspect_ratio,
          signal: controller.signal,
        });

        return JSON.stringify(result);
      }

      const apiKey = context.openaiApiKey?.trim();
      if (!apiKey) {
        return JSON.stringify({
          error:
            'Image generation is not configured on the server. Add OPENAI_API_KEY to .env and redeploy.',
        });
      }

      const result = await generateImageFromPrompt({
        prompt,
        aspectRatio: input.aspect_ratio,
        apiKey,
        model: context.openaiImageModel,
      });

      return JSON.stringify(result);
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
