import { describe, expect, it } from 'vitest';

import { getVisibleStreamingText } from '@/lib/streaming-text';

describe('getVisibleStreamingText', () => {
  it('shows live API text immediately while streaming', () => {
    expect(getVisibleStreamingText('hello world', 'hello')).toBe('hello world');
  });

  it('falls back to the smooth animation before live text arrives', () => {
    expect(getVisibleStreamingText(null, 'hello there')).toBe('hello there');
  });
});
