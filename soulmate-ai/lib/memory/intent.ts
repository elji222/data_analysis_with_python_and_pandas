import type { MemoryIntent } from '@/types/memory';

const REMEMBER_PATTERNS = [
  /^remember\s+that\s+(.+)$/i,
  /^please\s+remember\s+that\s+(.+)$/i,
  /^remember\s+(.+)$/i,
  /^save\s+to\s+memory[:\s]+(.+)$/i,
];

const FORGET_PATTERNS = [
  /^forget\s+that\s+(.+)$/i,
  /^please\s+forget\s+that\s+(.+)$/i,
  /^forget\s+(.+)$/i,
  /^delete\s+from\s+memory[:\s]+(.+)$/i,
];

const SKIP_PATTERNS = [
  /don'?t\s+remember\s+this/i,
  /do\s+not\s+remember\s+this/i,
  /don'?t\s+save\s+this/i,
  /do\s+not\s+save\s+this/i,
];

export function detectMemoryIntent(message: string): MemoryIntent {
  const trimmed = message.trim();
  if (!trimmed) return { type: 'normal' };

  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { type: 'skip' };
    }
  }

  for (const pattern of REMEMBER_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return { type: 'remember', text: match[1].trim() };
    }
  }

  for (const pattern of FORGET_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return { type: 'forget', text: match[1].trim() };
    }
  }

  return { type: 'normal' };
}
