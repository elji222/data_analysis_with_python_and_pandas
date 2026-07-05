export const MEMORY_CATEGORIES = [
  'basic_information',
  'preferences',
  'communication_style',
  'work_career',
  'projects',
  'goals_ambitions',
  'family_relationships',
  'education',
  'location_lifestyle',
  'interests_hobbies',
  'skills_expertise',
  'health_food_preferences',
  'ai_preferences',
  'important_dates',
  'favorites',
  'everything_else',
] as const;

export const MEMORY_VISIBILITIES = ['personal', 'friends', 'public'] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export type MemoryVisibility = (typeof MEMORY_VISIBILITIES)[number];

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
  visibility: MemoryVisibility;
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
