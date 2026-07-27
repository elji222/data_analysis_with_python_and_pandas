import { describe, expect, it } from 'vitest';

import {
  formatGenerateImageToolResultForAnthropic,
  getOpenAiImageModel,
  parseGenerateImageToolResult,
} from '@/lib/tools/generate-image';

describe('getOpenAiImageModel', () => {
  it('defaults to dall-e-3', () => {
    const original = process.env.OPENAI_IMAGE_MODEL;
    delete process.env.OPENAI_IMAGE_MODEL;

    expect(getOpenAiImageModel()).toBe('dall-e-3');

    if (original) {
      process.env.OPENAI_IMAGE_MODEL = original;
    }
  });

  it('uses configured model when provided', () => {
    expect(getOpenAiImageModel('dall-e-3')).toBe('dall-e-3');
  });
});

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

  it('parses data-url image tool output', () => {
    const parsed = parseGenerateImageToolResult(
      JSON.stringify({
        imageUrl: 'data:image/png;base64,abc123',
        prompt: 'A blue balloon',
      })
    );

    expect(parsed).toEqual({
      imageUrl: 'data:image/png;base64,abc123',
      prompt: 'A blue balloon',
    });
  });

  it('parses tool errors', () => {
    const parsed = parseGenerateImageToolResult(
      JSON.stringify({ error: 'Image generation is not configured on the server.' })
    );

    expect(parsed).toEqual({ error: 'Image generation is not configured on the server.' });
  });
});

describe('formatGenerateImageToolResultForAnthropic', () => {
  it('removes large image URLs from tool results sent back to Claude', () => {
    const hugeDataUrl = `data:image/png;base64,${'a'.repeat(500_000)}`;
    const sanitized = formatGenerateImageToolResultForAnthropic(
      JSON.stringify({
        imageUrl: hugeDataUrl,
        prompt: 'A random landscape',
      })
    );

    expect(sanitized.length).toBeLessThan(500);
    expect(sanitized).not.toContain('base64');
    expect(JSON.parse(sanitized)).toEqual({
      success: true,
      prompt: 'A random landscape',
      message: 'The image was generated and is already visible to the user in the chat.',
    });
  });

  it('keeps error tool results unchanged', () => {
    const original = JSON.stringify({ error: 'Image generation timed out. Please try again.' });
    expect(formatGenerateImageToolResultForAnthropic(original)).toBe(original);
  });
});
