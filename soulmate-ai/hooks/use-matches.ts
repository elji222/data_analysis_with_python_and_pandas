import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchMatches } from '@/services/matches-api';
import type { MatchRecommendation, MatchStatus } from '@/types/match';
import { MATCH_SECTIONS } from '@/types/match';

const STATUS_STORAGE_PREFIX = 'soulmate-match-status:v1:';
const LEGACY_STORAGE_PREFIX = 'soulmate-matches:';
const LEGACY_V2_STORAGE_PREFIX = 'soulmate-matches:v2:';

function statusStorageKey(userId: string) {
  return `${STATUS_STORAGE_PREFIX}${userId}`;
}

function legacyStorageKey(userId: string) {
  return `${LEGACY_STORAGE_PREFIX}${userId}`;
}

function legacyV2StorageKey(userId: string) {
  return `${LEGACY_V2_STORAGE_PREFIX}${userId}`;
}

type StoredMatchStatuses = Record<string, MatchStatus>;

function parseStoredStatuses(raw: string | null): StoredMatchStatuses {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const statuses: StoredMatchStatuses = {};
    for (const [matchId, status] of Object.entries(parsed)) {
      if (
        status === 'new' ||
        status === 'saved' ||
        status === 'waiting' ||
        status === 'active' ||
        status === 'passed'
      ) {
        statuses[matchId] = status;
      }
    }

    return statuses;
  } catch {
    return {};
  }
}

function applyStoredStatuses(
  matches: MatchRecommendation[],
  stored: StoredMatchStatuses
): MatchRecommendation[] {
  return matches.map((match) => ({
    ...match,
    status: stored[match.id] ?? match.status,
  }));
}

export function useMatches(userId: string | undefined, accessToken: string | undefined) {
  const [matches, setMatches] = useState<MatchRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!userId || !accessToken) {
        setMatches([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await AsyncStorage.multiRemove([legacyStorageKey(userId), legacyV2StorageKey(userId)]);

        const [remoteMatches, statusRaw] = await Promise.all([
          fetchMatches(accessToken),
          AsyncStorage.getItem(statusStorageKey(userId)),
        ]);

        const statuses = parseStoredStatuses(statusRaw);
        if (!cancelled) {
          setMatches(applyStoredStatuses(remoteMatches, statuses));
        }
      } catch (loadError) {
        if (!cancelled) {
          setMatches([]);
          setError(
            loadError instanceof Error ? loadError.message : 'Could not load matches.'
          );
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
  }, [accessToken, userId]);

  const persistStatuses = useCallback(
    async (nextMatches: MatchRecommendation[]) => {
      if (!userId) return;

      const statuses: StoredMatchStatuses = {};
      for (const match of nextMatches) {
        statuses[match.id] = match.status;
      }

      await AsyncStorage.setItem(statusStorageKey(userId), JSON.stringify(statuses));
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
    error,
    saveMatch: (matchId: string) => updateMatchStatus(matchId, 'saved'),
    passMatch: (matchId: string) => updateMatchStatus(matchId, 'passed'),
    requestIntro: (matchId: string) => updateMatchStatus(matchId, 'waiting'),
  };
}
