import { describe, expect, it } from 'vitest';

import {
  parseCouncilRanking,
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
