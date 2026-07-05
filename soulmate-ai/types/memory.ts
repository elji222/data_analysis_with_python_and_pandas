export const MEMORY_CATEGORIES = [
  'identity',
  'preferences',
  'goals',
  'work',
  'projects',
  'family',
  'education',
  'location',
  'interests',
  'communication_style',
  'important_dates',
  'other',
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export type MemoryExtractionAction = 'add' | 'update' | 'delete' | 'none';

export type MemoryExtractionItem = {
  action: MemoryExtractionAction;
  memory_id: string | null;
  category: MemoryCategory;
  memory_text: string;
  confidence: number;
  reason: string;
};

export type UserMemory = {
  id: string;
  user_id: string;
  category: MemoryCategory;
  memory_text: string;
  confidence: number;
  source_conversation_id: string | null;
  source_message_id: string | null;
  importance: number;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type UserMemorySettings = {
  user_id: string;
  enabled: boolean;
  preferred_language: string | null;
  answer_style: string | null;
  created_at: string;
  updated_at: string;
};

export type MemoryIntent =
  | { type: 'remember'; text: string }
  | { type: 'forget'; text: string }
  | { type: 'skip' }
  | { type: 'normal' };
