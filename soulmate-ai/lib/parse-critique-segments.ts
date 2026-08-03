export type CritiqueTextSegment = {
  text: string;
  bold: boolean;
};

export type ParsedCritique = {
  /** Opening free-text sentence(s) before any bullets. */
  summary: string;
  /** Actual criticism lines (without the leading "- "). */
  bullets: string[];
};

/** Splits critique copy so **marked** phrases can render in black bold. */
export function parseCritiqueSegments(text: string): CritiqueTextSegment[] {
  const segments: CritiqueTextSegment[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false });
  }

  return segments.length > 0 ? segments : [{ text, bold: false }];
}

/**
 * Splits a critique into an opening summary plus criticism bullets.
 * Accepts "- ", "* ", or "• " bullet markers.
 */
export function parseCritiqueStructure(text: string): ParsedCritique {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return { summary: '', bullets: [] };
  }

  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const summaryLines: string[] = [];
  const bullets: string[] = [];
  let seenBullet = false;

  for (const line of lines) {
    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      seenBullet = true;
      const item = bulletMatch[1].trim();
      if (item) bullets.push(item);
      continue;
    }

    if (!seenBullet) {
      summaryLines.push(line);
    } else {
      // Continuation after bullets started — treat as another bullet if useful.
      bullets.push(line);
    }
  }

  return {
    summary: summaryLines.join(' ').trim(),
    bullets,
  };
}
