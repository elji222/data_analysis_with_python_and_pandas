import type { ChatAttachment, ChatMessage } from '@/types/chat';
import type { Conversation } from '@/types/conversation';

const MAX_STORED_TEXT_PREVIEW_CHARS = 2000;
const MAX_STORED_MESSAGES_PER_CONVERSATION = 80;

function isHeavyUri(uri: string): boolean {
  return uri.startsWith('data:') || uri.startsWith('blob:');
}

export function stripAttachmentForStorage(attachment: ChatAttachment): ChatAttachment {
  const stripped: ChatAttachment = {
    id: attachment.id,
    name: attachment.name,
    mimeType: attachment.mimeType,
    kind: attachment.kind,
    uri: isHeavyUri(attachment.uri) ? '' : attachment.uri,
  };

  if (attachment.textPreview) {
    stripped.textPreview = attachment.textPreview.slice(0, MAX_STORED_TEXT_PREVIEW_CHARS);
  }

  return stripped;
}

export function stripMessageForStorage(message: ChatMessage): ChatMessage {
  if (!message.attachments?.length) return message;

  return {
    ...message,
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
  return items.map(stripConversationForStorage);
}

export function isStorageQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('quota') ||
    message.includes('exceeded') ||
    error.name === 'QuotaExceededError'
  );
}
