import { Platform } from 'react-native';

/** Keep chat uploads under typical edge/proxy body limits (~4–6 MB). */
export const MAX_IMAGE_BASE64_CHARS = 1_400_000;
const MAX_LONG_EDGE = 1280;
const INITIAL_JPEG_QUALITY = 0.82;
const MIN_JPEG_QUALITY = 0.45;

function isDataUri(uri: string): boolean {
  return uri.startsWith('data:');
}

function parseDataUri(uri: string): { mimeType: string; base64: string } | null {
  const match = uri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

async function uriToImageSource(uri: string): Promise<{ src: string; revoke?: () => void }> {
  if (isDataUri(uri)) return { src: uri };
  if (uri.startsWith('blob:') || uri.startsWith('http')) {
    return { src: uri };
  }
  return { src: uri };
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

function canvasToJpegBase64(canvas: HTMLCanvasElement, quality: number): string {
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const parsed = parseDataUri(dataUrl);
  if (!parsed) throw new Error('Failed to compress image');
  return parsed.base64;
}

async function compressOnWeb(uri: string, mimeType?: string): Promise<{ base64: string; mimeType: string }> {
  const { src, revoke } = await uriToImageSource(uri);
  let img: HTMLImageElement;
  try {
    img = await loadImage(src);
  } finally {
    revoke?.();
  }

  const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longEdge > MAX_LONG_EDGE ? MAX_LONG_EDGE / longEdge : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare image');
  ctx.drawImage(img, 0, 0, width, height);

  let quality = INITIAL_JPEG_QUALITY;
  let base64 = canvasToJpegBase64(canvas, quality);
  while (base64.length > MAX_IMAGE_BASE64_CHARS && quality > MIN_JPEG_QUALITY) {
    quality -= 0.08;
    base64 = canvasToJpegBase64(canvas, quality);
  }

  if (base64.length > MAX_IMAGE_BASE64_CHARS) {
    throw new Error(
      'Image is still too large after compression. Try a smaller photo or crop before sending.',
    );
  }

  return { base64, mimeType: 'image/jpeg' };
}

/**
 * Resize and compress photos before embedding in chat requests (web).
 * Native picks already use ImagePicker quality; returns input unchanged when small enough.
 */
export async function compressImageForUpload(
  uri: string,
  options?: { mimeType?: string; existingBase64?: string },
): Promise<{ uri: string; base64?: string; mimeType: string }> {
  if (options?.existingBase64) {
    if (options.existingBase64.length <= MAX_IMAGE_BASE64_CHARS) {
      return {
        uri,
        base64: options.existingBase64,
        mimeType: options.mimeType ?? 'image/jpeg',
      };
    }
    if (Platform.OS !== 'web') {
      throw new Error('Photo is too large. Try taking a new picture closer to the subject.');
    }
    const dataUri = `data:${options.mimeType ?? 'image/jpeg'};base64,${options.existingBase64}`;
    const compressed = await compressOnWeb(dataUri, options.mimeType);
    return {
      uri: `data:image/jpeg;base64,${compressed.base64}`,
      base64: compressed.base64,
      mimeType: compressed.mimeType,
    };
  }

  if (Platform.OS !== 'web') {
    return { uri, mimeType: options?.mimeType ?? 'image/jpeg' };
  }

  const compressed = await compressOnWeb(uri, options?.mimeType);
  return {
    uri: `data:image/jpeg;base64,${compressed.base64}`,
    base64: compressed.base64,
    mimeType: compressed.mimeType,
  };
}
