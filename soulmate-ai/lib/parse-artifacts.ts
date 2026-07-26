import type { PreviewArtifact, PreviewArtifactKind } from '@/types/preview-artifact';

const FENCED_BLOCK_REGEX = /```([\w+-]*)\s*\n([\s\S]*?)```/g;

const HTML_LANGUAGES = new Set(['html', 'htm']);
const CODE_LANGUAGES = new Set([
  'javascript',
  'js',
  'typescript',
  'ts',
  'tsx',
  'jsx',
  'css',
  'json',
  'python',
  'py',
  'sql',
  'bash',
  'sh',
  'markdown',
  'md',
]);

function inferKind(language: string, content: string): PreviewArtifactKind {
  const normalized = language.toLowerCase();

  if (HTML_LANGUAGES.has(normalized)) {
    return 'html';
  }

  if (normalized === 'svg' || content.trim().startsWith('<svg')) {
    return 'svg';
  }

  if (
    HTML_LANGUAGES.has(normalized) ||
    (!normalized && /<(html|body|div|section|main|style|script)\b/i.test(content))
  ) {
    return 'html';
  }

  if (CODE_LANGUAGES.has(normalized) || normalized) {
    return 'code';
  }

  return 'code';
}

function buildTitle(kind: PreviewArtifactKind, language: string) {
  if (kind === 'html') return 'Web preview';
  if (kind === 'svg') return 'SVG preview';
  if (language) return `${language.toUpperCase()} code`;
  return 'Code preview';
}

export function parseArtifacts(text: string): PreviewArtifact[] {
  const artifacts: PreviewArtifact[] = [];
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = FENCED_BLOCK_REGEX.exec(text)) !== null) {
    const language = (match[1] ?? '').trim().toLowerCase();
    const content = match[2]?.trim() ?? '';
    if (!content) continue;

    const kind = inferKind(language, content);
    artifacts.push({
      id: `artifact-${index}`,
      kind,
      language: language || (kind === 'html' ? 'html' : 'text'),
      title: buildTitle(kind, language),
      content,
    });
    index += 1;
  }

  return artifacts;
}

export function stripArtifactBlocks(text: string) {
  return text.replace(FENCED_BLOCK_REGEX, '').replace(/\n{3,}/g, '\n\n').trim();
}

export function wrapHtmlDocument(content: string) {
  if (/<html[\s>]/i.test(content)) {
    return content;
  }

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
    </style>
  </head>
  <body>
    ${content}
  </body>
</html>`;
}

export function wrapSvgDocument(content: string) {
  if (content.trim().startsWith('<svg')) {
    return wrapHtmlDocument(content);
  }

  return wrapHtmlDocument(content);
}
