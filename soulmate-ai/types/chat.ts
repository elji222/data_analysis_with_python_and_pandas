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

export type CouncilCritique = {
  fromModelId: string;
  fromModelLabel: string;
  text: string;
};

export type CouncilAnswer = {
  modelId: string;
  modelLabel: string;
  rank: number;
  answer: string;
  critiques: CouncilCritique[];
};

export type CouncilReview = {
  answers: CouncilAnswer[];
};

export type ChatMessage = {
  id: string;
  text: string;
  role: ChatRole;
  createdAt: number;
  attachments?: ChatAttachment[];
  /** Present on Council-mode assistant replies. */
  councilReview?: CouncilReview;
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
