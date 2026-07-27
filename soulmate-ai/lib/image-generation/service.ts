const OPENAI_IMAGES_ENDPOINT = 'https://api.openai.com/v1/images/generations';
export const IMAGE_GENERATION_TIMEOUT_MS = 180_000;
const DEFAULT_IMAGE_MODEL = 'dall-e-3';
const FALLBACK_IMAGE_MODEL = 'gpt-image-2';

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

function shouldTryFallbackModel(error: unknown, primaryModel: string) {
  if (primaryModel === FALLBACK_IMAGE_MODEL) {
    return false;
  }

  if (!(error instanceof Error)) {
    return true;
  }

  if (error.name === 'AbortError') {
    return false;
  }

  const message = error.message.toLowerCase();
  return !message.includes('timed out');
}

async function withImageTimeout<T>(callback: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_GENERATION_TIMEOUT_MS);

  try {
    return await callback(controller.signal);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Image generation timed out. Please try again.');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export type GenerateImageRequest = {
  prompt: string;
  aspectRatio?: unknown;
  apiKey: string;
  model?: string | null;
};

export async function generateImageFromPrompt(request: GenerateImageRequest) {
  const prompt = request.prompt.trim();
  if (!prompt) {
    throw new Error('Image generation failed: prompt is required.');
  }

  const apiKey = request.apiKey.trim();
  if (!apiKey) {
    throw new Error(
      'Image generation is not configured on the server. Add OPENAI_API_KEY to .env and redeploy.'
    );
  }

  const primaryModel = getOpenAiImageModel(request.model);
  const primarySize = resolveImageSize(request.aspectRatio, primaryModel);

  try {
    return await withImageTimeout(async (signal) => {
      const imageUrl = await requestGeneratedImage({
        apiKey,
        model: primaryModel,
        prompt,
        size: primarySize,
        signal,
      });

      return { imageUrl, prompt };
    });
  } catch (primaryError) {
    if (!shouldTryFallbackModel(primaryError, primaryModel)) {
      throw primaryError;
    }

    const fallbackSize = resolveImageSize(request.aspectRatio, FALLBACK_IMAGE_MODEL);

    return withImageTimeout(async (signal) => {
      const imageUrl = await requestGeneratedImage({
        apiKey,
        model: FALLBACK_IMAGE_MODEL,
        prompt,
        size: fallbackSize,
        signal,
      });

      return { imageUrl, prompt };
    });
  }
}
