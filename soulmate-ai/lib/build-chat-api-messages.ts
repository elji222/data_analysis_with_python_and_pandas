import type { ApiContentBlock, ChatApiMessage, ChatAttachment, ChatMessage } from '@/types/chat';

const IMAGE_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function isImageMediaType(mimeType: string): mimeType is 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  return IMAGE_MEDIA_TYPES.has(mimeType);
}

function buildUserContent(message: ChatMessage): string | ApiContentBlock[] {
  const blocks: ApiContentBlock[] = [];
  const attachments = message.attachments ?? [];

  for (const attachment of attachments) {
    if (attachment.kind === 'image' && attachment.base64 && isImageMediaType(attachment.mimeType)) {
      blocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: attachment.mimeType,
          data: attachment.base64,
        },
      });
      continue;
    }

    if (attachment.textPreview) {
      blocks.push({
        type: 'text',
        text: `Attached file (${attachment.name}):\n${attachment.textPreview}`,
      });
    } else if (attachment.kind === 'file') {
      blocks.push({
        type: 'text',
        text: `Attached file: ${attachment.name}`,
      });
    }
  }

  const trimmedText = message.text.trim();
  if (trimmedText) {
    blocks.push({ type: 'text', text: trimmedText });
  }

  if (blocks.length === 0) {
    return 'Hello';
  }

  if (blocks.length === 1 && blocks[0].type === 'text') {
    return blocks[0].text;
  }

  return blocks;
}

export function buildChatApiMessages(messages: ChatMessage[]): ChatApiMessage[] {
  return messages.map((message) => {
    if (message.role === 'assistant') {
      return { role: 'assistant', content: message.text };
    }

    return {
      role: 'user',
      content: buildUserContent(message),
    };
  });
}

export function getMessagePreviewText(message: ChatMessage): string {
  if (message.text.trim()) return message.text.trim();

  const attachment = message.attachments?.[0];
  if (!attachment) return 'New message';

  if (attachment.kind === 'image') {
    return 'Image';
  }

  return attachment.name;
}

export function cloneAttachments(attachments: ChatAttachment[]): ChatAttachment[] {
  return attachments.map((attachment) => ({ ...attachment }));
}
