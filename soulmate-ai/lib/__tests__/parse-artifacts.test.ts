import { describe, expect, it } from 'vitest';

import { parseArtifacts, stripArtifactBlocks, wrapHtmlDocument } from '@/lib/parse-artifacts';

describe('parseArtifacts', () => {
  it('extracts html fenced blocks', () => {
    const artifacts = parseArtifacts('Here is a page:\n\n```html\n<h1>Hello</h1>\n```');

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]?.kind).toBe('html');
    expect(artifacts[0]?.content).toContain('<h1>Hello</h1>');
  });

  it('extracts code blocks with language labels', () => {
    const artifacts = parseArtifacts('```typescript\nconst total = 1 + 2;\n```');

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]?.kind).toBe('code');
    expect(artifacts[0]?.language).toBe('typescript');
  });

  it('strips fenced blocks from visible message text', () => {
    const text = 'Intro\n\n```html\n<div>Hi</div>\n```\n\nOutro';
    expect(stripArtifactBlocks(text)).toBe('Intro\n\nOutro');
  });
});

describe('wrapHtmlDocument', () => {
  it('wraps fragments in a full html document', () => {
    const html = wrapHtmlDocument('<p>Preview</p>');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<p>Preview</p>');
  });
});
