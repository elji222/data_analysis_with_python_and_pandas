import { SOULMATE_SYSTEM_PROMPT } from '@/constants/ai';
import type { UserMemory, UserMemorySettings } from '@/types/memory';

import { buildMemoryPromptSection, buildProfileSection } from './search';

export function buildChatSystemPrompt(
  settings: UserMemorySettings | null,
  relevantMemories: UserMemory[]
): string {
  const sections = [SOULMATE_SYSTEM_PROMPT];

  const profile = buildProfileSection(settings);
  if (profile) sections.push(profile);

  const memories = buildMemoryPromptSection(relevantMemories);
  if (memories) sections.push(memories);

  sections.push(
    'Use remembered user details naturally when helpful. Do not mention the memory system unless the user asks.'
  );

  return sections.join('\n\n');
}
