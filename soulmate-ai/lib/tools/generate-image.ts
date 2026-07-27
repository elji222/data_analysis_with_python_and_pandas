import type { ToolHandler } from './types';

const OPENAI_IMAGES_ENDPOINT = 'https://api.openai.com/v1/images/generations';
const REQUEST_TIMEOUT_MS = 25_000;
const DEFAULT_IMAGE_MODEL = 'gpt-image-2';
const FALLBACK_IMAGE_MODEL = 'dall-e-3';

type DalleImageSize = '1024x1024' | '1792x1024' | '1024x1792';
type GptImageSize = '1024x1024' | '1536x1024' | '1024x1536';
type ImageSize = DalleImageSize | GptImageSize;

function isDalleModel(model: string) {
  return model === 'dall-e-3' || model === 'dall-e-2';
}

function resolveImageSize(aspectRatio: unknown, model: string): ImageSize {
  const value = typeof aspectRatio === 'string' ? aspectRatio.trim().toLowerCase() : '';

  if (isDalleModel(model)) {
    if (value === 'landscape' || value === 'wide' || value === '16:9') {
      return '1792x1024';
    }

    if (value === 'portrait' || value === 'tall' || value === '9:16') {
      return '1024x1792';
    }

    return '1024x1024';
  }

  if (value === 'landscape' || value === 'wide' || value === '16:9') {
    return '1536x1024';
  }

  if (value === 'portrait' || value === 'tall' || value === '9:16') {
    return '1024x1536';
  }

  return '1024x1024';
}

export function getOpenAiImageModel(configured?: string | null) {
  const model = configured?.trim() || process.env.OPENAI_IMAGE_MODEL?.trim();
  return model || DEFAULT_IMAGE_MODEL;
}

function buildImageRequestBody(model: string, prompt: string, size: ImageSize) {
  const body: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    size,
  };

  if (isDalleModel(model)) {
    body.response_format = 'url';
  }

  return body;
}

function extractImageUrl(data?: Array<{ url?: string; b64_json?: string }>) {
  const item = data?.[0];
  const directUrl = item?.url?.trim();
  if (directUrl) {
    return directUrl;
  }

  const base64 = item?.b64_json?.trim();
  if (base64) {
    return `data:image/png;base64,${base64}`;
  }

  return null;
}

async function requestGeneratedImage(params: {
  apiKey: string;
  model: string;
  prompt: string;
  size: ImageSize;
  signal: AbortSignal;
}) {
  const response = await fetch(OPENAI_IMAGES_ENDPOINT, {
    method: 'POST',
    signal: params.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify(
      buildImageRequestBody(params.model, params.prompt, params.size)
    ),
  });

  const json = (await response.json().catch(() => ({}))) as {
    data?: Array<{ url?: string; b64_json?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    const message = json.error?.message ?? `Image generation failed (${response.status}).`;
    throw new Error(message);
  }

  const imageUrl = extractImageUrl(json.data);
  if (!imageUrl) {
    throw new Error('Image generation did not return image data.');
  }

  return imageUrl;
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

    const primaryModel = getOpenAiImageModel(context.openaiImageModel);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const primarySize = resolveImageSize(input.aspect_ratio, primaryModel);

      try {
        const imageUrl = await requestGeneratedImage({
          apiKey,
          model: primaryModel,
          prompt,
          size: primarySize,
          signal: controller.signal,
        });

        return JSON.stringify({
          imageUrl,
          prompt,
        });
      } catch (primaryError) {
        if (primaryModel === FALLBACK_IMAGE_MODEL) {
          throw primaryError;
        }

        const fallbackSize = resolveImageSize(input.aspect_ratio, FALLBACK_IMAGE_MODEL);
        const imageUrl = await requestGeneratedImage({
          apiKey,
          model: FALLBACK_IMAGE_MODEL,
          prompt,
          size: fallbackSize,
          signal: controller.signal,
        });

        return JSON.stringify({
          imageUrl,
          prompt,
        });
      }
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
