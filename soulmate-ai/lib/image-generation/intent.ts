const IMAGE_REQUEST_PATTERN =
  /\b(generate|create|draw|make|show|give)\b[\s\S]{0,40}\b(image|picture|photo|illustration|artwork|drawing)\b/i;

export function isLikelyImageGenerationRequest(message: string) {
  const trimmed = message.trim();
  if (!trimmed) return false;

  return (
    IMAGE_REQUEST_PATTERN.test(trimmed) ||
    /\brandom image\b/i.test(trimmed) ||
    /\bimage for me\b/i.test(trimmed)
  );
}
