const TRIVIAL_PATTERNS = [
  /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure|cool|great|nice)\.?$/i,
  /^(good morning|good night|goodbye|bye)\.?$/i,
  /^how are you\??$/i,
  /^what('?s| is) the weather/i,
];

const MIN_MEMORY_LENGTH = 8;

export function isTrivialMemory(text: string): boolean {
  const normalized = text.trim();
  if (normalized.length < MIN_MEMORY_LENGTH) return true;
  return TRIVIAL_PATTERNS.some((pattern) => pattern.test(normalized));
}
