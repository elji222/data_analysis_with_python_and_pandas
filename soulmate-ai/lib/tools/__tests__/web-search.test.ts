import { describe, expect, it, vi, afterEach } from 'vitest';

import { webSearchTool } from '@/lib/tools/web-search';

describe('webSearchTool', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a helpful message when Tavily is not configured', async () => {
    const result = await webSearchTool.execute({ query: 'Israel news today' }, {});
    expect(result).toContain('not configured');
  });

  it('formats Tavily search results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              title: 'Latest headlines',
              url: 'https://example.com/news',
              content: 'A short summary of the story.',
            },
          ],
        }),
      })
    );

    const result = await webSearchTool.execute(
      { query: 'Israel news today' },
      { tavilyApiKey: 'test-key' }
    );

    expect(result).toContain('Latest headlines');
    expect(result).toContain('https://example.com/news');
    expect(result).toContain('A short summary of the story.');
  });
});
