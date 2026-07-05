import {
  MEMORY_CATEGORIES,
  MEMORY_VISIBILITIES,
  type MemoryCategory,
  type MemoryVisibility,
} from '@/types/memory';

export const MEMORY_CATEGORY_LABELS: Record<MemoryCategory, string> = {
  basic_information: 'Basic Information',
  preferences: 'Preferences',
  communication_style: 'Communication Style',
  work_career: 'Work & Career',
  projects: 'Projects',
  goals_ambitions: 'Goals & Ambitions',
  family_relationships: 'Family & Relationships',
  education: 'Education',
  location_lifestyle: 'Location & Lifestyle',
  interests_hobbies: 'Interests & Hobbies',
  skills_expertise: 'Skills & Expertise',
  health_food_preferences: 'Health & Food Preferences',
  ai_preferences: 'AI Preferences',
  important_dates: 'Important Dates',
  favorites: 'Favorites',
  everything_else: 'Everything Else',
};

export const MEMORY_VISIBILITY_LABELS: Record<
  MemoryVisibility,
  { label: string; icon: string }
> = {
  personal: { label: 'Personal', icon: '🔒' },
  friends: { label: 'Friends', icon: '👥' },
  public: { label: 'Public', icon: '🌍' },
};

const LEGACY_CATEGORY_MAP: Record<string, MemoryCategory> = {
  identity: 'basic_information',
  preferences: 'preferences',
  goals: 'goals_ambitions',
  work: 'work_career',
  projects: 'projects',
  family: 'family_relationships',
  education: 'education',
  location: 'location_lifestyle',
  interests: 'interests_hobbies',
  communication_style: 'communication_style',
  important_dates: 'important_dates',
  other: 'everything_else',
};

const CATEGORY_KEYWORDS: Record<MemoryCategory, string[]> = {
  basic_information: ['name', 'called', 'i am', "i'm", 'gender', 'pronoun', 'age', 'born'],
  preferences: ['prefer', 'like', 'favorite', 'favourite', 'love', 'hate', 'avoid', 'want'],
  communication_style: ['concise', 'detailed', 'brief', 'tone', 'style', 'explain', 'emoji'],
  work_career: ['work', 'job', 'career', 'employer', 'office', 'boss', 'colleague', 'company'],
  projects: ['project', 'building', 'app', 'startup', 'side hustle', 'product'],
  goals_ambitions: ['goal', 'plan', 'hope', 'dream', 'aim', 'aspire', 'ambition'],
  family_relationships: ['family', 'wife', 'husband', 'partner', 'child', 'son', 'daughter', 'parent', 'mom', 'dad'],
  education: ['school', 'university', 'college', 'study', 'degree', 'class', 'course'],
  location_lifestyle: ['live', 'city', 'country', 'timezone', 'based in', 'from', 'lifestyle'],
  interests_hobbies: ['hobby', 'interest', 'enjoy', 'into', 'fan of', 'play', 'read'],
  skills_expertise: ['skill', 'expert', 'experience', 'proficient', 'knows', 'specialist'],
  health_food_preferences: ['health', 'diet', 'food', 'allergy', 'allergic', 'vegetarian', 'vegan', 'gluten'],
  ai_preferences: ['ai', 'assistant', 'chatgpt', 'model', 'memory', 'response', 'soulmate'],
  important_dates: ['birthday', 'anniversary', 'deadline', 'date', 'event', 'holiday'],
  favorites: ['favorite', 'favourite', 'best', 'top', 'go-to'],
  everything_else: [],
};

export function formatMemoryCategory(category: MemoryCategory | string): string {
  if (isMemoryCategory(category)) {
    return MEMORY_CATEGORY_LABELS[category];
  }
  return MEMORY_CATEGORY_LABELS[normalizeMemoryCategory(category)];
}

export function formatMemoryVisibility(visibility: MemoryVisibility | string): string {
  const normalized = normalizeMemoryVisibility(visibility);
  const entry = MEMORY_VISIBILITY_LABELS[normalized];
  return `${entry.icon} ${entry.label}`;
}

export function isMemoryCategory(value: unknown): value is MemoryCategory {
  return typeof value === 'string' && MEMORY_CATEGORIES.includes(value as MemoryCategory);
}

export function isMemoryVisibility(value: unknown): value is MemoryVisibility {
  return typeof value === 'string' && MEMORY_VISIBILITIES.includes(value as MemoryVisibility);
}

export function normalizeMemoryCategory(value: unknown): MemoryCategory {
  if (typeof value !== 'string') return 'everything_else';
  if (isMemoryCategory(value)) return value;
  return LEGACY_CATEGORY_MAP[value] ?? 'everything_else';
}

export function normalizeMemoryVisibility(value: unknown): MemoryVisibility {
  if (isMemoryVisibility(value)) return value;
  return 'personal';
}

export function classifyMemoryCategory(memoryText: string): MemoryCategory {
  const normalized = memoryText.trim().toLowerCase();
  if (!normalized) return 'everything_else';

  let bestCategory: MemoryCategory = 'everything_else';
  let bestScore = 0;

  for (const category of MEMORY_CATEGORIES) {
    if (category === 'everything_else') continue;

    let score = 0;
    for (const keyword of CATEGORY_KEYWORDS[category]) {
      if (normalized.includes(keyword)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestScore > 0 ? bestCategory : 'everything_else';
}
