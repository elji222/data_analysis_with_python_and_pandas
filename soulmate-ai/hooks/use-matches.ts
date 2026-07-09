import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { MatchRecommendation, MatchStatus } from '@/types/match';
import { MATCH_SECTIONS } from '@/types/match';

const STORAGE_PREFIX = 'soulmate-matches:v2:';
const LEGACY_STORAGE_PREFIX = 'soulmate-matches:';

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function legacyStorageKey(userId: string) {
  return `${LEGACY_STORAGE_PREFIX}${userId}`;
}

function isMatchRecommendation(value: unknown): value is MatchRecommendation {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.compatibilitySummary === 'string' &&
    Array.isArray(record.reasons) &&
    typeof record.matchStrength === 'string' &&
    typeof record.status === 'string'
  );
}

function parseStoredMatches(raw: string | null): MatchRecommendation[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isMatchRecommendation);
  } catch {
    return [];
  }
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
        await AsyncStorage.removeItem(legacyStorageKey(userId));

        const raw = await AsyncStorage.getItem(storageKey(userId));
        if (!cancelled) {
          setMatches(parseStoredMatches(raw));
        }
      } catch {
        if (!cancelled) {
          setMatches([]);
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

  const persistMatches = useCallback(
    async (nextMatches: MatchRecommendation[]) => {
      if (!userId) return;
      await AsyncStorage.setItem(storageKey(userId), JSON.stringify(nextMatches));
    },
    [userId]
  );

  const updateMatchStatus = useCallback(
    async (matchId: string, status: MatchStatus) => {
      setMatches((previous) => {
        const next = previous.map((match) =>
          match.id === matchId ? { ...match, status } : match
        );
        void persistMatches(next);
        return next;
      });
    },
    [persistMatches]
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
