import { describe, expect, it } from 'vitest';

import {
  parseCouncilJudgment,
  parseCouncilRanking,
  scoreCouncilPeerRankings,
  scoreCouncilRankings,
} from '@/lib/agent/run-council-agent';

describe('parseCouncilRanking', () => {
  it('reads a JSON array of answer labels', () => {
    expect(parseCouncilRanking('["B","A","C"]', ['A', 'B', 'C'])).toEqual(['B', 'A', 'C']);
  });

  it('ignores the letter A inside the word Answer', () => {
    expect(parseCouncilRanking('Answer B is best, then C, then A.', ['A', 'B', 'C'])).toEqual([
      'B',
      'C',
      'A',
    ]);
  });

  it('appends labels the model forgot', () => {
    expect(parseCouncilRanking('["C","A"]', ['A', 'B', 'C'])).toEqual(['C', 'A', 'B']);
  });
});

describe('parseCouncilJudgment', () => {
  it('reads ranking and critiques from a JSON object', () => {
    expect(
      parseCouncilJudgment(
        '{"ranking":["B","A","C"],"critiques":{"A":"Too vague.","B":"Clear and warm.","C":"Missed the ask."}}',
        ['A', 'B', 'C']
      )
    ).toEqual({
      ranking: ['B', 'A', 'C'],
      critiques: {
        A: 'Too vague.',
        B: 'Clear and warm.',
        C: 'Missed the ask.',
      },
    });
  });

  it('falls back to ranking-only parsing when JSON is missing', () => {
    expect(parseCouncilJudgment('Best is B, then A, then C.', ['A', 'B', 'C'])).toEqual({
      ranking: ['B', 'A', 'C'],
      critiques: {},
    });
  });

  it('ignores empty critique strings', () => {
    expect(
      parseCouncilJudgment(
        '{"ranking":["A","B","C"],"critiques":{"A":"Solid.","B":"  ","C":""}}',
        ['A', 'B', 'C']
      )
    ).toEqual({
      ranking: ['A', 'B', 'C'],
      critiques: {
        A: 'Solid.',
      },
    });
  });
});

describe('scoreCouncilRankings', () => {
  it('uses Borda count and breaks ties by original label order', () => {
    // A: 2+1 = 3, B: 1+2 = 3, C: 0+0 = 0 → A before B by original order
    expect(
      scoreCouncilRankings(
        [
          ['A', 'B', 'C'],
          ['B', 'A', 'C'],
        ],
        ['A', 'B', 'C']
      )
    ).toEqual(['A', 'B', 'C']);
  });

  it('ranks a clear winner first', () => {
    expect(
      scoreCouncilRankings(
        [
          ['B', 'A', 'C'],
          ['B', 'C', 'A'],
          ['B', 'A', 'C'],
        ],
        ['A', 'B', 'C']
      )
    ).toEqual(['B', 'A', 'C']);
  });
});

describe('scoreCouncilPeerRankings', () => {
  it('ignores each model voting for its own answer', () => {
    // Without peer-only scoring, each self-vote for #1 ties everyone at 2.
    // With peer-only scoring, only cross-votes count:
    // A (claude) ranked 1st by gpt + gemini → wins.
    expect(
      scoreCouncilPeerRankings(
        [
          { memberId: 'claude', ranking: ['A', 'B', 'C'] },
          { memberId: 'gpt', ranking: ['B', 'A', 'C'] },
          { memberId: 'gemini', ranking: ['C', 'A', 'B'] },
        ],
        [
          { label: 'A', memberId: 'claude' },
          { label: 'B', memberId: 'gpt' },
          { label: 'C', memberId: 'gemini' },
        ],
        ['A', 'B', 'C']
      )
    ).toEqual(['A', 'B', 'C']);
  });

  it('still elects a peer favorite when self-votes would obscure it', () => {
    // Each model ranks itself first, but peers all prefer B second/first among others.
    expect(
      scoreCouncilPeerRankings(
        [
          { memberId: 'claude', ranking: ['A', 'B', 'C'] },
          { memberId: 'gpt', ranking: ['B', 'C', 'A'] },
          { memberId: 'gemini', ranking: ['C', 'B', 'A'] },
        ],
        [
          { label: 'A', memberId: 'claude' },
          { label: 'B', memberId: 'gpt' },
          { label: 'C', memberId: 'gemini' },
        ],
        ['A', 'B', 'C']
      )
    ).toEqual(['B', 'C', 'A']);
  });
});
