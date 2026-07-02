export type ChatRole = 'user' | 'assistant';

export type ChatAttachmentKind = 'image' | 'file';

export type ChatAttachment = {
  id: string;
  name: string;
  mimeType: string;
  kind: ChatAttachmentKind;
  uri: string;
  base64?: string;
  textPreview?: string;
};

export type ChatMessage = {
  id: string;
  text: string;
  role: ChatRole;
  createdAt: number;
  attachments?: ChatAttachment[];
};

export type ApiTextBlock = {
  type: 'text';
  text: string;
};

export type ApiImageBlock = {
  type: 'image';
  source: {
    type: 'base64';
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    data: string;
  };
};

export type ApiContentBlock = ApiTextBlock | ApiImageBlock;

export type ChatApiMessage = {
  role: ChatRole;
  content: string | ApiContentBlock[];
};
