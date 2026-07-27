import { describe, expect, it } from 'vitest';

import { parseGenerateImageToolResult } from '@/lib/tools/generate-image';

describe('parseGenerateImageToolResult', () => {
  it('parses successful image tool output', () => {
    const parsed = parseGenerateImageToolResult(
      JSON.stringify({
        imageUrl: 'https://example.com/image.png',
        prompt: 'A red balloon',
      })
    );

    expect(parsed).toEqual({
      imageUrl: 'https://example.com/image.png',
      prompt: 'A red balloon',
    });
  });

  it('parses tool errors', () => {
    const parsed = parseGenerateImageToolResult(
      JSON.stringify({ error: 'Image generation is not configured on the server.' })
    );

    expect(parsed).toEqual({ error: 'Image generation is not configured on the server.' });
  });
});
