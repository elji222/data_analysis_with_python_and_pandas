import { Platform } from 'react-native';

import type { ChatAttachment } from '@/types/chat';

const MAX_TEXT_FILE_CHARS = 8000;

function createAttachmentId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMimeType(mimeType: string, fileName: string) {
  if (mimeType) return mimeType;

  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.gif')) return 'image/gif';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  if (lowerName.endsWith('.txt')) return 'text/plain';
  if (lowerName.endsWith('.json')) return 'application/json';
  if (lowerName.endsWith('.md')) return 'text/markdown';

  return 'application/octet-stream';
}

async function readTextPreview(file: File): Promise<string | undefined> {
  const mimeType = normalizeMimeType(file.type, file.name);
  if (!mimeType.startsWith('text/') && !file.name.endsWith('.md') && !file.name.endsWith('.json')) {
    return undefined;
  }

  try {
    const text = await file.text();
    return text.slice(0, MAX_TEXT_FILE_CHARS);
  } catch {
    return undefined;
  }
}

async function readBase64(file: File): Promise<string | undefined> {
  try {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(',')[1] ?? '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } catch {
    return undefined;
  }
}

export function isMobileWebBrowser() {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') {
    return false;
  }

  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function pickFileViaWebInput(): Promise<ChatAttachment | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf,.txt,.md,.json,application/json,text/plain';
    input.style.display = 'none';

    const cleanup = () => {
      input.removeEventListener('change', handleChange);
      input.removeEventListener('cancel', handleCancel);
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
    };

    const handleCancel = () => {
      cleanup();
      resolve(null);
    };

    const handleChange = async () => {
      const file = input.files?.[0];
      cleanup();

      if (!file) {
        resolve(null);
        return;
      }

      const mimeType = normalizeMimeType(file.type, file.name);
      const objectUrl = URL.createObjectURL(file);
      const isImage = mimeType.startsWith('image/');

      if (isImage) {
        const base64 = await readBase64(file);
        resolve({
          id: createAttachmentId(),
          name: file.name,
          mimeType,
          kind: 'image',
          uri: objectUrl,
          base64,
        });
        return;
      }

      const textPreview = await readTextPreview(file);
      resolve({
        id: createAttachmentId(),
        name: file.name,
        mimeType,
        kind: 'file',
        uri: objectUrl,
        textPreview,
      });
    };

    input.addEventListener('change', handleChange);
    input.addEventListener('cancel', handleCancel);
    document.body.appendChild(input);
    input.click();
  });
}
