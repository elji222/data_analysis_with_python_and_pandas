import { describe, expect, it } from 'vitest';

import {
  parseCritiqueSegments,
  parseCritiqueStructure,
} from '@/lib/parse-critique-segments';

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

describe('parseCritiqueStructure', () => {
  it('splits free text from criticism bullets', () => {
    expect(
      parseCritiqueStructure(
        'Clear overview of the main options.\n- Missed **tradeoffs on cost**\n- No concrete **next step for the user**'
      )
    ).toEqual({
      summary: 'Clear overview of the main options.',
      bullets: ['Missed **tradeoffs on cost**', 'No concrete **next step for the user**'],
    });
  });

  it('keeps plain critiques as summary only', () => {
    expect(parseCritiqueStructure('Too vague on the ask.')).toEqual({
      summary: 'Too vague on the ask.',
      bullets: [],
    });
  });

  it('supports bullet and asterisk markers', () => {
    expect(parseCritiqueStructure('Decent start.\n• Weak on **evidence**\n* Skipped **risks**')).toEqual({
      summary: 'Decent start.',
      bullets: ['Weak on **evidence**', 'Skipped **risks**'],
    });
  });
});
