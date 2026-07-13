import { describe, expect, it } from 'vitest';

import { formatChatError, formatUploadError } from '@/lib/upload-errors';

describe('upload error messages', () => {
  it('replaces generic fetch failures with a clearer upload message', () => {
    expect(formatUploadError(new Error('Failed to fetch'))).toMatch(/too large|connection/i);
    expect(formatUploadError(new Error('NetworkError when attempting to fetch resource.'))).toMatch(
      /too large|connection/i
    );
  });

  it('keeps explicit size errors', () => {
    const message = 'Image is still too large after compression.';
    expect(formatUploadError(new Error(message))).toBe(message);
  });

  it('falls back for unknown errors', () => {
    expect(formatUploadError('nope')).toBe('nope');
    expect(formatUploadError(null)).toBe('Could not attach photo');
    expect(formatChatError(null)).toBe('Something went wrong. Please try again.');
  });
});
