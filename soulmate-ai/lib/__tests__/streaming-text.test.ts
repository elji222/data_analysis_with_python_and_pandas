import { describe, expect, it } from 'vitest';

import { getVisibleStreamingText } from '@/lib/streaming-text';

describe('getVisibleStreamingText', () => {
  it('prefers the longer live stream over the smooth animation', () => {
    expect(getVisibleStreamingText('hello world', 'hello')).toBe('hello world');
  });

  it('falls back to the smooth animation when it is ahead', () => {
    expect(getVisibleStreamingText('hello', 'hello there')).toBe('hello there');
  });
});
