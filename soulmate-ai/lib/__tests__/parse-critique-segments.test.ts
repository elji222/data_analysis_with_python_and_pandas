import { describe, expect, it } from 'vitest';

import { parseCritiqueSegments } from '@/lib/parse-critique-segments';

describe('parseCritiqueSegments', () => {
  it('marks **phrases** as bold segments', () => {
    expect(parseCritiqueSegments('Strong on **sleep windows**, but missed **wake windows**.')).toEqual([
      { text: 'Strong on ', bold: false },
      { text: 'sleep windows', bold: true },
      { text: ', but missed ', bold: false },
      { text: 'wake windows', bold: true },
      { text: '.', bold: false },
    ]);
  });

  it('returns plain text when there is no markup', () => {
    expect(parseCritiqueSegments('No highlights here.')).toEqual([
      { text: 'No highlights here.', bold: false },
    ]);
  });
});
