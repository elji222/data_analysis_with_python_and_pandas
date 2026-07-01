export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  text: string;
  role: ChatRole;
  createdAt: number;
};

export type ChatApiMessage = {
  role: ChatRole;
  content: string;
};
