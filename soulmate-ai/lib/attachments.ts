import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import type { ChatAttachment } from '@/types/chat';

const MAX_TEXT_FILE_CHARS = 8000;
const MAX_IMAGE_ATTACHMENTS = 3;

function createAttachmentId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureImagePermission() {
  if (Platform.OS === 'web') return;

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo permission is required to attach images.');
  }
}

async function ensureCameraPermission() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera permission is required to take a photo.');
  }
}

function normalizeMimeType(mimeType?: string | null, fileName?: string) {
  if (mimeType) return mimeType;

  const lowerName = fileName?.toLowerCase() ?? '';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.gif')) return 'image/gif';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  if (lowerName.endsWith('.txt')) return 'text/plain';
  if (lowerName.endsWith('.json')) return 'application/json';
  if (lowerName.endsWith('.md')) return 'text/markdown';

  return 'application/octet-stream';
}

async function readTextFromUri(uri: string): Promise<string> {
  const response = await fetch(uri);
  const text = await response.text();
  return text.slice(0, MAX_TEXT_FILE_CHARS);
}

function buildImageAttachment(params: {
  uri: string;
  name: string;
  mimeType: string;
  base64?: string | null;
}): ChatAttachment {
  return {
    id: createAttachmentId(),
    name: params.name,
    mimeType: params.mimeType,
    kind: 'image',
    uri: params.uri,
    base64: params.base64 ?? undefined,
  };
}

export async function pickImageFromLibrary(): Promise<ChatAttachment | null> {
  await ensureImagePermission();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: Platform.OS === 'web' ? 0.55 : 0.72,
    base64: true,
    allowsMultipleSelection: false,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const mimeType = normalizeMimeType(asset.mimeType, asset.fileName ?? 'image.jpg');

  return buildImageAttachment({
    uri: asset.uri,
    name: asset.fileName ?? 'image.jpg',
    mimeType,
    base64: asset.base64,
  });
}

export async function takePhoto(): Promise<ChatAttachment | null> {
  await ensureCameraPermission();

  const result = await ImagePicker.launchCameraAsync({
    quality: Platform.OS === 'web' ? 0.55 : 0.72,
    base64: true,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const mimeType = normalizeMimeType(asset.mimeType, 'photo.jpg');

  return buildImageAttachment({
    uri: asset.uri,
    name: 'photo.jpg',
    mimeType,
    base64: asset.base64,
  });
}

export async function pickPhotosAndFiles(): Promise<ChatAttachment | null> {
  if (Platform.OS === 'web') {
    return pickDocument();
  }

  const image = await pickImageFromLibrary();
  if (image) return image;

  return pickDocument();
}

export async function pickDocument(): Promise<ChatAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const mimeType = normalizeMimeType(asset.mimeType, asset.name);
  const isImage = mimeType.startsWith('image/');

  if (isImage) {
    let base64: string | undefined;

    try {
      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl.split(',')[1] ?? '');
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64',
        });
      }
    } catch {
      base64 = undefined;
    }

    return buildImageAttachment({
      uri: asset.uri,
      name: asset.name,
      mimeType,
      base64,
    });
  }

  let textPreview: string | undefined;
  if (mimeType.startsWith('text/') || asset.name.endsWith('.md') || asset.name.endsWith('.json')) {
    try {
      textPreview = await readTextFromUri(asset.uri);
    } catch {
      textPreview = undefined;
    }
  }

  return {
    id: createAttachmentId(),
    name: asset.name,
    mimeType,
    kind: 'file',
    uri: asset.uri,
    textPreview,
  };
}

export function canAddImageAttachment(currentAttachments: ChatAttachment[]) {
  const imageCount = currentAttachments.filter((attachment) => attachment.kind === 'image').length;
  return imageCount < MAX_IMAGE_ATTACHMENTS;
}

export function shouldShowCameraOption() {
  return Platform.OS !== 'web';
}
