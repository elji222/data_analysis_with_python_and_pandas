import { Platform } from 'react-native';

import type { ChatAttachment, ChatMessage } from '@/types/chat';
import type { Conversation } from '@/types/conversation';

const MAX_STORED_TEXT_PREVIEW_CHARS = 2000;
const MAX_STORED_MESSAGES_PER_CONVERSATION = 80;
const MAX_STORED_CONVERSATIONS = 30;

function isHeavyUri(uri: string): boolean {
  return uri.startsWith('data:') || uri.startsWith('blob:') || uri.startsWith('file:');
}

export function stripAttachmentForStorage(attachment: ChatAttachment): ChatAttachment {
  const stripped: ChatAttachment = {
    id: attachment.id,
    name: attachment.name,
    mimeType: attachment.mimeType,
    kind: attachment.kind,
    uri:
      attachment.kind === 'image' || Platform.OS === 'web' || isHeavyUri(attachment.uri)
        ? ''
        : attachment.uri,
  };

  if (attachment.textPreview) {
    stripped.textPreview = attachment.textPreview.slice(0, MAX_STORED_TEXT_PREVIEW_CHARS);
  }

  return stripped;
}

export function stripMessageForStorage(message: ChatMessage): ChatMessage {
  const strippedText =
    message.text.length > 12000 ? `${message.text.slice(0, 12000)}…` : message.text;

  if (!message.attachments?.length) {
    return strippedText === message.text ? message : { ...message, text: strippedText };
  }

  return {
    ...message,
    text: strippedText,
    attachments: message.attachments.map(stripAttachmentForStorage),
  };
}

export function stripConversationForStorage(conversation: Conversation): Conversation {
  const messages = conversation.messages.map(stripMessageForStorage);
  const trimmedMessages =
    messages.length > MAX_STORED_MESSAGES_PER_CONVERSATION
      ? messages.slice(-MAX_STORED_MESSAGES_PER_CONVERSATION)
      : messages;

  return {
    ...conversation,
    messages: trimmedMessages,
  };
}

export function stripConversationsForStorage(items: Conversation[]): Conversation[] {
  const stripped = items.map(stripConversationForStorage);
  return stripped.length > MAX_STORED_CONVERSATIONS
    ? stripped.slice(0, MAX_STORED_CONVERSATIONS)
    : stripped;
}

export function isStorageQuotaError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === 'string') {
    const message = error.toLowerCase();
    return message.includes('quota') || message.includes('exceeded');
  }

  if (typeof error === 'object') {
    const name = 'name' in error ? String(error.name) : '';
    const message = 'message' in error ? String(error.message).toLowerCase() : '';
    return (
      name === 'QuotaExceededError' ||
      message.includes('quota') ||
      message.includes('exceeded the quota') ||
      message.includes('storage')
    );
  }

  return false;
}
