import { classifyMemoryCategory } from '@/lib/memory/categories';
import type { MemoryCategory, UserMemory, UserMemorySettings } from '@/types/memory';

const CATEGORY_KEYWORDS: Record<MemoryCategory, string[]> = {
  basic_information: ['name', 'called', 'i am', "i'm", 'gender', 'pronoun', 'age'],
  preferences: ['prefer', 'like', 'favorite', 'favourite', 'love', 'hate', 'avoid', 'want'],
  communication_style: ['concise', 'detailed', 'brief', 'tone', 'style', 'explain', 'emoji'],
  work_career: ['work', 'job', 'career', 'employer', 'office', 'boss', 'colleague'],
  projects: ['project', 'building', 'app', 'startup', 'side hustle'],
  goals_ambitions: ['goal', 'plan', 'hope', 'dream', 'aim', 'aspire'],
  family_relationships: ['family', 'wife', 'husband', 'partner', 'child', 'son', 'daughter', 'parent', 'mom', 'dad'],
  education: ['school', 'university', 'college', 'study', 'degree', 'class', 'course'],
  location_lifestyle: ['live', 'city', 'country', 'timezone', 'based in', 'from'],
  interests_hobbies: ['hobby', 'interest', 'enjoy', 'into', 'fan of', 'play', 'read'],
  skills_expertise: ['skill', 'expert', 'experience', 'proficient', 'specialist'],
  health_food_preferences: ['health', 'diet', 'food', 'allergy', 'vegetarian', 'vegan'],
  ai_preferences: ['ai', 'assistant', 'chatgpt', 'model', 'memory', 'response'],
  important_dates: ['birthday', 'anniversary', 'deadline', 'date', 'event'],
  favorites: ['favorite', 'favourite', 'best', 'top', 'go-to'],
  everything_else: [],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function scoreMemory(memory: UserMemory, queryTokens: string[]): number {
  const memoryTokens = new Set(tokenize(memory.memory_text));
  let overlap = 0;

  for (const token of queryTokens) {
    if (memoryTokens.has(token)) overlap += 1;
  }

  let score = overlap * 2;
  if (memory.is_pinned) score += 5;
  score += memory.importance * 0.5;
  score += memory.confidence;

  for (const keyword of CATEGORY_KEYWORDS[memory.category] ?? []) {
    if (queryTokens.some((token) => keyword.includes(token) || token.includes(keyword))) {
      score += 1.5;
    }
  }

  return score;
}

export function filterMemoriesForAiPrompt(memories: UserMemory[]): UserMemory[] {
  return memories.filter((memory) => (memory.visibility ?? 'personal') === 'personal');
}

export function rankMemoriesForQuery(
  memories: UserMemory[],
  query: string,
  limit = 15
): UserMemory[] {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) {
    return memories
      .slice()
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return b.importance - a.importance;
      })
      .slice(0, limit);
  }

  return memories
    .map((memory) => ({ memory, score: scoreMemory(memory, queryTokens) }))
    .filter((item) => item.score > 0 || item.memory.is_pinned)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.memory);
}

export function buildProfileSection(settings: UserMemorySettings | null): string {
  if (!settings) return '';

  const lines: string[] = [];
  if (settings.preferred_language) {
    lines.push(`Preferred language: ${settings.preferred_language}`);
  }
  if (settings.answer_style) {
    lines.push(`Preferred answer style: ${settings.answer_style}`);
  }

  if (!lines.length) return '';
  return `Core profile preferences:\n${lines.map((line) => `- ${line}`).join('\n')}`;
}

export function buildMemoryPromptSection(memories: UserMemory[]): string {
  if (!memories.length) return '';

  const lines = memories.map((memory) => `- ${memory.memory_text}`);
  return `Relevant user memories:\n${lines.join('\n')}`;
}

export function findDuplicateMemory(
  memories: UserMemory[],
  memoryText: string
): UserMemory | null {
  const normalized = memoryText.trim().toLowerCase();
  return (
    memories.find((memory) => memory.memory_text.trim().toLowerCase() === normalized) ?? null
  );
}

export function findBestForgetMatch(memories: UserMemory[], query: string): UserMemory | null {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return null;

  const ranked = rankMemoriesForQuery(memories, query, 5);
  return ranked[0] ?? null;
}

export { classifyMemoryCategory };
