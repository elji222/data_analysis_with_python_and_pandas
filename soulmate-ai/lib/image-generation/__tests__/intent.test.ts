import { describe, expect, it } from 'vitest';

import { isLikelyImageGenerationRequest } from '@/lib/image-generation/intent';

describe('isLikelyImageGenerationRequest', () => {
  it('detects direct image generation requests', () => {
    expect(isLikelyImageGenerationRequest('generate a random image for me')).toBe(true);
    expect(isLikelyImageGenerationRequest('Can you draw a picture of a cat?')).toBe(true);
    expect(isLikelyImageGenerationRequest('create an illustration of mountains')).toBe(true);
  });

  it('ignores unrelated requests', () => {
    expect(isLikelyImageGenerationRequest('give me the html code')).toBe(false);
    expect(isLikelyImageGenerationRequest('what is the weather today?')).toBe(false);
  });
});
