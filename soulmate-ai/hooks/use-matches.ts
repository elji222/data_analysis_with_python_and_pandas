import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { MOCK_MATCHES } from '@/lib/matches/mock-matches';
import type { MatchRecommendation, MatchStatus } from '@/types/match';
import { MATCH_SECTIONS } from '@/types/match';

const STORAGE_PREFIX = 'soulmate-matches:';

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

type StoredMatchState = Record<string, MatchStatus>;

function applyStoredStatuses(
  matches: MatchRecommendation[],
  stored: StoredMatchState | null
): MatchRecommendation[] {
  if (!stored) return matches;

  return matches.map((match) => ({
    ...match,
    status: stored[match.id] ?? match.status,
  }));
}

export function useMatches(userId: string | undefined) {
  const [matches, setMatches] = useState<MatchRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!userId) {
        setMatches([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const raw = await AsyncStorage.getItem(storageKey(userId));
        const stored = raw ? (JSON.parse(raw) as StoredMatchState) : null;
        if (!cancelled) {
          setMatches(applyStoredStatuses(MOCK_MATCHES, stored));
        }
      } catch {
        if (!cancelled) {
          setMatches(MOCK_MATCHES);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persistStatuses = useCallback(
    async (nextMatches: MatchRecommendation[]) => {
      if (!userId) return;

      const stored: StoredMatchState = {};
      for (const match of nextMatches) {
        stored[match.id] = match.status;
      }

      await AsyncStorage.setItem(storageKey(userId), JSON.stringify(stored));
    },
    [userId]
  );

  const updateMatchStatus = useCallback(
    async (matchId: string, status: MatchStatus) => {
      setMatches((previous) => {
        const next = previous.map((match) =>
          match.id === matchId ? { ...match, status } : match
        );
        void persistStatuses(next);
        return next;
      });
    },
    [persistStatuses]
  );

  const visibleMatches = useMemo(
    () => matches.filter((match) => match.status !== 'passed'),
    [matches]
  );

  const sections = useMemo(
    () =>
      MATCH_SECTIONS.map((section) => ({
        ...section,
        data: visibleMatches.filter((match) => match.status === section.key),
      })).filter((section) => section.data.length > 0),
    [visibleMatches]
  );

  const hasMatches = visibleMatches.length > 0;

  return {
    matches: visibleMatches,
    sections,
    hasMatches,
    isLoading,
    saveMatch: (matchId: string) => updateMatchStatus(matchId, 'saved'),
    passMatch: (matchId: string) => updateMatchStatus(matchId, 'passed'),
    requestIntro: (matchId: string) => updateMatchStatus(matchId, 'waiting'),
  };
}
